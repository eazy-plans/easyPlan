-- ============================================================
-- Make client_email optional on events
-- ============================================================
-- Some clients won't give an email; forcing one made secretaries invent
-- addresses that bounce. The email pipeline already tolerates a missing
-- address (notify route returns "no client email", cancel route skips the
-- client email + log when absent).

ALTER TABLE events
  ALTER COLUMN client_email DROP NOT NULL;

UPDATE events SET client_email = NULL WHERE client_email = '';
