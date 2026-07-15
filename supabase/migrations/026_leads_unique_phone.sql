-- ============================================================
-- Enforce lead uniqueness by phone
-- ============================================================
-- The app keys leads on client_phone everywhere (booking upsert, cancel
-- route lookup, lead card dialog - all use maybeSingle/onConflict), but
-- nothing stopped duplicate phones from being inserted. Dedupe existing
-- rows, then add the unique index the code already assumes.
--
-- NULL phones stay allowed and non-unique (Postgres treats NULLs as
-- distinct), so contact-less leads from 018 are unaffected.
--
-- Each statement recomputes the same keeper mapping via a CTE instead of a
-- temp table (the dashboard linter flags CREATE TABLE without RLS, even for
-- session-local temp tables). The mapping is stable across statements: it
-- reads only `leads`, which nothing modifies until the final DELETE.
-- Keeper = the most recently updated lead per phone (its status/notes are
-- the current truth).

-- Safety net: 018 already nulled empty strings, but re-normalize in case
-- new empties slipped in since.
UPDATE leads SET client_phone = NULL WHERE client_phone = '';

-- ── lead_venue_interests: unique(lead_id, venue_id) ──
-- Drop rows that would collide with an existing keeper row, then repoint.
WITH dupes AS (
  SELECT id AS dup_id, keeper_id FROM (
    SELECT id, first_value(id) OVER (
      PARTITION BY client_phone
      ORDER BY updated_at DESC, created_at DESC, id
    ) AS keeper_id
    FROM leads WHERE client_phone IS NOT NULL
  ) t WHERE id <> keeper_id
)
DELETE FROM lead_venue_interests lvi
USING dupes d
WHERE lvi.lead_id = d.dup_id
  AND EXISTS (SELECT 1 FROM lead_venue_interests k
              WHERE k.lead_id = d.keeper_id AND k.venue_id = lvi.venue_id);

WITH dupes AS (
  SELECT id AS dup_id, keeper_id FROM (
    SELECT id, first_value(id) OVER (
      PARTITION BY client_phone
      ORDER BY updated_at DESC, created_at DESC, id
    ) AS keeper_id
    FROM leads WHERE client_phone IS NOT NULL
  ) t WHERE id <> keeper_id
)
UPDATE lead_venue_interests lvi
SET lead_id = d.keeper_id
FROM dupes d
WHERE lvi.lead_id = d.dup_id;

-- ── lead_inquiries: unique(lead_id, venue_id) ──
WITH dupes AS (
  SELECT id AS dup_id, keeper_id FROM (
    SELECT id, first_value(id) OVER (
      PARTITION BY client_phone
      ORDER BY updated_at DESC, created_at DESC, id
    ) AS keeper_id
    FROM leads WHERE client_phone IS NOT NULL
  ) t WHERE id <> keeper_id
)
DELETE FROM lead_inquiries li
USING dupes d
WHERE li.lead_id = d.dup_id
  AND EXISTS (SELECT 1 FROM lead_inquiries k
              WHERE k.lead_id = d.keeper_id AND k.venue_id = li.venue_id);

WITH dupes AS (
  SELECT id AS dup_id, keeper_id FROM (
    SELECT id, first_value(id) OVER (
      PARTITION BY client_phone
      ORDER BY updated_at DESC, created_at DESC, id
    ) AS keeper_id
    FROM leads WHERE client_phone IS NOT NULL
  ) t WHERE id <> keeper_id
)
UPDATE lead_inquiries li
SET lead_id = d.keeper_id
FROM dupes d
WHERE li.lead_id = d.dup_id;

-- ── waitlist: unique(lead_id, venue_id, requested_date) ──
WITH dupes AS (
  SELECT id AS dup_id, keeper_id FROM (
    SELECT id, first_value(id) OVER (
      PARTITION BY client_phone
      ORDER BY updated_at DESC, created_at DESC, id
    ) AS keeper_id
    FROM leads WHERE client_phone IS NOT NULL
  ) t WHERE id <> keeper_id
)
DELETE FROM waitlist w
USING dupes d
WHERE w.lead_id = d.dup_id
  AND EXISTS (SELECT 1 FROM waitlist k
              WHERE k.lead_id = d.keeper_id AND k.venue_id = w.venue_id
                AND k.requested_date = w.requested_date);

WITH dupes AS (
  SELECT id AS dup_id, keeper_id FROM (
    SELECT id, first_value(id) OVER (
      PARTITION BY client_phone
      ORDER BY updated_at DESC, created_at DESC, id
    ) AS keeper_id
    FROM leads WHERE client_phone IS NOT NULL
  ) t WHERE id <> keeper_id
)
UPDATE waitlist w
SET lead_id = d.keeper_id
FROM dupes d
WHERE w.lead_id = d.dup_id;

-- ── Drop the now-orphaned duplicates and enforce uniqueness ──
WITH dupes AS (
  SELECT id AS dup_id, keeper_id FROM (
    SELECT id, first_value(id) OVER (
      PARTITION BY client_phone
      ORDER BY updated_at DESC, created_at DESC, id
    ) AS keeper_id
    FROM leads WHERE client_phone IS NOT NULL
  ) t WHERE id <> keeper_id
)
DELETE FROM leads l USING dupes d WHERE l.id = d.dup_id;

CREATE UNIQUE INDEX IF NOT EXISTS leads_client_phone_unique ON leads(client_phone);
