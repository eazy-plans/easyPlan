-- ============================================================
-- Persisted venue coordinates
-- ============================================================
-- The map view geocodes venue addresses through Nominatim (OpenStreetMap),
-- which allows at most 1 request/second. Coordinates live on the venue row:
-- the map only geocodes venues whose coordinates are missing and persists the
-- result, so each address is geocoded once ever. Editing a venue's
-- address/city clears the coordinates so the next map view re-geocodes, and
-- admins can drag a pin to overwrite a bad geocode.

-- coords_approximate = true means only the city could be geocoded, not the
-- street address; the map shows these as amber "approximate" pins until an
-- admin drags the pin to the real spot (which sets the flag back to false).
alter table venues
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists coords_approximate boolean not null default false;
