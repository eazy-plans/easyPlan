-- Add extra lead status values: too_expensive, not_relevant
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'too_expensive';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'not_relevant';
