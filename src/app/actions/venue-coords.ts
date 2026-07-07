/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type VenueCoords = {
  lat: number;
  lng: number;
  /** True when only the city could be resolved, not the street address. */
  approximate: boolean;
};

type Point = { lat: number; lng: number };

// Nominatim's usage policy allows at most 1 request/second.
const NOMINATIM_DELAY_MS = 1000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Free-text search against Nominatim (OpenStreetMap's geocoder). No API key,
 * but the usage policy requires an identifying User-Agent and max 1 req/sec.
 * countrycodes includes "ps" because OSM tags towns like ביתר עילית and their
 * streets under the Palestinian territories code - with "il" alone the town
 * doesn't resolve at all (verified: only a checkpoint outside it matches).
 */
async function nominatimSearch(params: Record<string, string>): Promise<Point | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "il,ps");
  url.searchParams.set("accept-language", "he");

  const res = await fetch(url, {
    headers: { "User-Agent": "Eazyplans/1.0 (venue map geocoder)" },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  const hit = results?.[0];
  if (!hit) return null;

  const lat = Number.parseFloat(hit.lat);
  const lng = Number.parseFloat(hit.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// City anchors are shared by every venue in the same city - cache them for
// the life of the server process to cut Nominatim traffic roughly in half.
const cityAnchorCache = new Map<string, Point | null>();

async function cityAnchor(city: string): Promise<Point | null> {
  const cached = cityAnchorCache.get(city);
  if (cached !== undefined) return cached;

  // featureType=settlement keeps the anchor on the town itself rather than a
  // same-named POI (for ביתר עילית the plain search returns a military
  // checkpoint 2km outside the city).
  let anchor = await nominatimSearch({ q: city, featureType: "settlement" });
  if (!anchor) {
    await sleep(NOMINATIM_DELAY_MS);
    anchor = await nominatimSearch({ q: city });
  }
  cityAnchorCache.set(city, anchor);
  return anchor;
}

/**
 * Returns coordinates for a venue, geocoding and persisting them on first use.
 *
 * Street searches are bounded to a ~7km box around the city anchor so a
 * same-named street in another town can never hijack the pin (verified:
 * unbounded, "מיכה 6, חיפה" matched a street in Binyamina 40km away). If the
 * street can't be resolved even without its house number, the venue falls
 * back to the city anchor and is flagged approximate.
 *
 * Coordinates are derived, non-sensitive data, so any signed-in staff member
 * may trigger the fill (secretaries view the map most but can't update venues
 * under RLS - hence the service-role write after the auth check). Server
 * actions are public HTTP endpoints: keep the auth check.
 */
export async function geocodeVenue(venueId: string): Promise<VenueCoords | null> {
  if (!venueId) throw new Error("Missing venueId");

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // The caller must be able to see the venue under their own RLS policies.
  const { data: venue } = await (supabase.from("venues") as any)
    .select("*")
    .eq("id", venueId)
    .maybeSingle();
  if (!venue) throw new Error("Venue not found");

  if (venue.lat != null && venue.lng != null) {
    return { lat: venue.lat, lng: venue.lng, approximate: venue.coords_approximate ?? false };
  }

  const address = (venue.address ?? "").trim();
  const city = (venue.city ?? "").trim();

  const anchor = city ? await cityAnchor(city) : null;

  let coords: Point | null = null;
  let approximate = false;

  if (address) {
    const bounded: Record<string, string> = anchor
      ? {
          viewbox: `${anchor.lng - 0.07},${anchor.lat - 0.07},${anchor.lng + 0.07},${anchor.lat + 0.07}`,
          bounded: "1",
        }
      : {};

    await sleep(NOMINATIM_DELAY_MS);
    coords = await nominatimSearch({ q: city ? `${address}, ${city}` : address, ...bounded });

    if (!coords) {
      // Retry without the house number - OSM often has the street but not
      // the individual building.
      const streetOnly = address.replace(/\d+\s*$/, "").trim();
      if (streetOnly && streetOnly !== address) {
        await sleep(NOMINATIM_DELAY_MS);
        coords = await nominatimSearch({ q: city ? `${streetOnly}, ${city}` : streetOnly, ...bounded });
      }
    }
  }

  if (!coords && anchor) {
    coords = anchor;
    approximate = true;
  }
  if (!coords) return null;

  // Fill-only write: never overwrite coordinates another session (or an admin
  // drag-fix) already saved. Persist failures are non-fatal - before migration
  // 020 the lat/lng columns don't exist yet and the map should still work.
  const admin = createAdminClient();
  await (admin.from("venues") as any)
    .update({ lat: coords.lat, lng: coords.lng, coords_approximate: approximate })
    .eq("id", venueId)
    .is("lat", null)
    .then(() => null, () => null);

  return { ...coords, approximate };
}

/**
 * Overwrites a venue's coordinates - used by the admin "drag the pin to fix
 * it" flow. Runs through the caller's own client so RLS decides who may:
 * admins for any venue, owners for their own, secretaries not at all.
 */
export async function setVenueCoords(venueId: string, lat: number, lng: number): Promise<void> {
  if (!venueId) throw new Error("Missing venueId");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Invalid coordinates");
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error("Invalid coordinates");

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await (supabase.from("venues") as any)
    .update({ lat, lng, coords_approximate: false })
    .eq("id", venueId)
    .select("id");
  if (error) throw new Error(error.message);
  // RLS silently updates zero rows when the caller may not edit this venue.
  if (!data?.length) throw new Error("Not allowed to move this venue's pin");
}
