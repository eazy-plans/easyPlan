"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import type { VenueRow } from "@/types/database";
import { geocodeVenue, setVenueCoords, type VenueCoords } from "@/app/actions/venue-coords";

interface VenueMapProps {
  venues: VenueRow[];
  /** Admins may drag a misplaced pin; the new position is persisted. */
  canEditPins?: boolean;
}

// Jerusalem - shown only until the first venue coordinates arrive.
const DEFAULT_CENTER: L.LatLngExpression = [31.7683, 35.2137];

// Nominatim's usage policy allows at most 1 request/second, so venues missing
// stored coordinates are geocoded one at a time with this gap between calls.
// Persisted results (migration 020) make this a one-time cost per venue.
const GEOCODE_INTERVAL_MS = 1100;

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}"/>
      <circle cx="14" cy="14" r="5.5" fill="white"/>
    </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

const EXACT_PIN = pinIcon("#2563eb");
// Amber pin = only the city could be geocoded, not the street address.
const APPROXIMATE_PIN = pinIcon("#d97706");

/**
 * Keeps the viewport around the markers as geocoded positions stream in -
 * until the user navigates via search, after which their viewport wins.
 */
function FitBounds({
  points,
  suspendedRef,
}: {
  points: [number, number][];
  suspendedRef: React.RefObject<boolean>;
}) {
  const map = useMap();
  useEffect(() => {
    if (suspendedRef.current || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [map, points, suspendedRef]);
  return null;
}

export function VenueMap({ venues, canEditPins = false }: VenueMapProps) {
  // Coordinates resolved this session (geocoded or dragged). These override
  // the row values, which go stale the moment an admin drags a pin.
  const [localCoords, setLocalCoords] = useState<Record<string, VenueCoords>>({});
  // Venues we already tried to geocode - failures are not retried, so a bad
  // address can't hammer Nominatim in a loop.
  const attempted = useRef<Set<string>>(new Set());
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  // Once the user jumps to a search result, stop auto-fitting the viewport
  // around markers - late-arriving geocodes must not yank the view away.
  const searchNavigated = useRef(false);
  const [query, setQuery] = useState("");

  const coordsById = useMemo(() => {
    const map = new Map<string, VenueCoords>();
    for (const venue of venues) {
      if (localCoords[venue.id]) {
        map.set(venue.id, localCoords[venue.id]);
      } else if (venue.lat != null && venue.lng != null) {
        map.set(venue.id, {
          lat: venue.lat,
          lng: venue.lng,
          approximate: venue.coords_approximate ?? false,
        });
      }
    }
    return map;
  }, [venues, localCoords]);

  // Venues that fell back to the same city center share identical coordinates
  // and would stack into one unclickable pin - spread ties in a small circle
  // (~60m). Display only; the true coordinates stay untouched in the DB.
  const displayCoords = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const [id, c] of coordsById) {
      const key = `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
      const group = groups.get(key);
      if (group) group.push(id);
      else groups.set(key, [id]);
    }
    const spread = new Map<string, VenueCoords>();
    for (const ids of groups.values()) {
      if (ids.length === 1) {
        spread.set(ids[0], coordsById.get(ids[0])!);
        continue;
      }
      ids.forEach((id, i) => {
        const c = coordsById.get(id)!;
        const angle = (2 * Math.PI * i) / ids.length;
        spread.set(id, {
          ...c,
          lat: c.lat + 0.0006 * Math.cos(angle),
          lng: c.lng + 0.0006 * Math.sin(angle),
        });
      });
    }
    return spread;
  }, [coordsById]);

  const points = useMemo(
    () => Array.from(displayCoords.values(), (c): [number, number] => [c.lat, c.lng]),
    [displayCoords]
  );

  // Geocode venues without stored coordinates, serially per Nominatim policy.
  // The server action persists each result so no future page view repeats it.
  useEffect(() => {
    const queue = venues.filter(
      (v) => (v.lat == null || v.lng == null) && !attempted.current.has(v.id)
    );
    if (queue.length === 0) return;
    queue.forEach((v) => attempted.current.add(v.id));

    let cancelled = false;
    // Venues this run claimed but hasn't finished. Cleanup releases them so a
    // remount (including StrictMode's simulated one in dev) retries them
    // instead of finding an "already attempted" empty queue.
    const pending = new Set(queue.map((v) => v.id));
    (async () => {
      for (const venue of queue) {
        if (cancelled) return;
        try {
          const coords = await geocodeVenue(venue.id);
          pending.delete(venue.id);
          if (coords && !cancelled) {
            setLocalCoords((prev) => ({ ...prev, [venue.id]: coords }));
          }
        } catch {
          // Processed but failed: stays in attempted, off the map this session.
          pending.delete(venue.id);
        }
        await new Promise((resolve) => setTimeout(resolve, GEOCODE_INTERVAL_MS));
      }
    })();

    return () => {
      cancelled = true;
      pending.forEach((id) => attempted.current.delete(id));
    };
  }, [venues]);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return venues
      .filter((v) =>
        [v.name, v.address, v.city, v.neighborhood].some((field) => field?.includes(q))
      )
      .slice(0, 8);
  }, [query, venues]);

  const goToVenue = (venue: VenueRow) => {
    const coords = displayCoords.get(venue.id);
    setQuery("");
    if (!coords || !mapRef.current) return;
    searchNavigated.current = true;
    const map = mapRef.current;
    map.flyTo([coords.lat, coords.lng], Math.max(map.getZoom(), 15));
    map.once("moveend", () => markerRefs.current[venue.id]?.openPopup());
  };

  const handleDragEnd = (venue: VenueRow, marker: L.Marker) => {
    const pos = marker.getLatLng();
    // Optimistic: keep the pin where it was dropped even if persisting fails
    // (e.g. migration 020 not applied yet) - it only reverts on reload.
    setLocalCoords((prev) => ({
      ...prev,
      [venue.id]: { lat: pos.lat, lng: pos.lng, approximate: false },
    }));
    setVenueCoords(venue.id, pos.lat, pos.lng)
      .then(() => toast.success("מיקום האולם עודכן"))
      .catch((err) => {
        console.error("Failed to save venue pin position", err);
        toast.error("שמירת מיקום האולם נכשלה - המיקום יאבד ברענון");
      });
  };

  return (
    <div className="relative w-full h-full">
      {/* z-[1000] floats above Leaflet's panes (controls sit at z-index 1000). */}
      <div className="absolute top-3 right-3 z-[1000] w-64">
        <div className="relative">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
              if (e.key === "Enter") {
                const first = matches.find((m) => displayCoords.has(m.id));
                if (first) goToVenue(first);
              }
            }}
            placeholder="חיפוש אולם..."
            className="pr-9 bg-background shadow-md"
          />
        </div>
        {query.trim() && (
          <ul className="mt-1 rounded-md border bg-background shadow-md overflow-hidden">
            {matches.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">לא נמצאו אולמות</li>
            )}
            {matches.map((venue) => {
              const hasCoords = displayCoords.has(venue.id);
              return (
                <li key={venue.id}>
                  <button
                    type="button"
                    onClick={() => goToVenue(venue)}
                    disabled={!hasCoords}
                    className="w-full text-right px-3 py-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="block text-sm font-medium">{venue.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {venue.address}, {venue.city}
                      {!hasCoords && " · ללא מיקום במפה"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <MapContainer
        ref={mapRef}
        center={DEFAULT_CENTER}
        zoom={13}
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds points={points} suspendedRef={searchNavigated} />

        {venues.map((venue) => {
          const coords = displayCoords.get(venue.id);
          if (!coords) return null;

          return (
            <Marker
              key={venue.id}
              ref={(marker) => {
                markerRefs.current[venue.id] = marker;
              }}
              position={[coords.lat, coords.lng]}
              icon={coords.approximate ? APPROXIMATE_PIN : EXACT_PIN}
              draggable={canEditPins}
              eventHandlers={
                canEditPins
                  ? { dragend: (e) => handleDragEnd(venue, e.target as L.Marker) }
                  : undefined
              }
            >
              <Popup>
                <div dir="rtl" className="text-sm max-w-xs">
                  <p className="font-semibold">{venue.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {venue.address}, {venue.city}
                  </p>
                  {venue.neighborhood && (
                    <p className="text-xs text-muted-foreground">{venue.neighborhood}</p>
                  )}
                  {coords.approximate && (
                    <p className="text-xs text-warning mt-1">מיקום משוער (לפי עיר בלבד)</p>
                  )}
                  {canEditPins && (
                    <p className="text-xs text-muted-foreground/70 mt-1">ניתן לגרור את הסיכה לתיקון המיקום</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
