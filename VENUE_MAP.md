# Venue Map

The Venues page has a table/map toggle ("טבלה" / "מפה"). The map view shows all
venues as pins on an OpenStreetMap map rendered with Leaflet — **no API key, no
billing account, no setup required.**

## How it works

- **Rendering**: `react-leaflet` + OpenStreetMap tiles (`VenueMap.tsx`), loaded
  client-side only via `next/dynamic` with `ssr: false` (Leaflet needs
  `window`). OSM tiles require the attribution line kept in the `TileLayer`.
- **Geocoding**: addresses are resolved server-side through
  [Nominatim](https://nominatim.org) (OpenStreetMap's free geocoder) in the
  `geocodeVenue` server action. Its usage policy allows 1 request/second, so
  the map geocodes missing venues one at a time. The strategy (each step
  verified against the real venue data):
  1. Resolve the **city** first (`featureType=settlement`, and
     `countrycodes=il,ps` — towns like ביתר עילית don't resolve under `il`
     alone).
  2. Search the street address **bounded to a ~7km box around the city**, so a
     same-named street in another town can never hijack the pin.
  3. If that misses, retry without the house number.
  4. If that misses too, pin the **city center** and flag the venue
     `coords_approximate`.
- **Caching**: coordinates and the approximate flag are persisted on
  `venues.lat` / `lng` / `coords_approximate` (migration
  `020_venue_coordinates.sql`), so each address is geocoded **once ever**, not
  per page view. Editing a venue's address or city clears the stored
  coordinates so it gets re-geocoded (`VenueForm.tsx`).
- **Pin colors**: blue = street-level match, **amber** = city-center
  approximation, with a "מיקום משוער" note in the popup. Venues stacked on the
  same city center are spread in a small (~60m) circle on screen so each stays
  clickable; the stored coordinates are untouched.
- **Fixing a wrong pin**: admins can drag any pin to the correct spot; the new
  position is saved via the `setVenueCoords` server action (RLS decides who may
  write). A dragged position is never overwritten by re-geocoding.
- **Search**: the box in the map's top corner filters venues by name, address,
  city, or neighborhood as you type (Enter jumps to the first match, Escape
  closes). Selecting a result flies the map to that venue and opens its popup;
  venues not yet on the map are listed disabled with "ללא מיקום במפה". After a
  search jump the map stops auto-fitting around incoming pins, so the view
  stays where the user put it.

## Prerequisite

Migration `020_venue_coordinates.sql` must be applied (Supabase dashboard SQL
editor or `supabase db push`). Until it is:

- the map still works, but geocoding results aren't cached (re-geocoded per view),
- pin drag-fixes don't persist,
- **saving a venue with a changed address fails**, because `VenueForm` clears
  the not-yet-existing `lat`/`lng` columns.

## Troubleshooting

- **Venue missing from the map**: Nominatim couldn't resolve the address or the
  city. Check the venue's address/city fields, or have an admin drag a pin
  after fixing the address. Failures are not retried within a session.
- **Pin in the wrong place**: drag it (as admin) — the fix is permanent.
