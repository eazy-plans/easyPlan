-- ============================================================
-- Make phone and email optional for leads
-- ============================================================

ALTER TABLE leads
  ALTER COLUMN client_phone DROP NOT NULL,
  ALTER COLUMN client_email DROP NOT NULL;

-- Update existing empty values to NULL (if any)
UPDATE leads SET client_phone = NULL WHERE client_phone = '';
UPDATE leads SET client_email = NULL WHERE client_email = '';
