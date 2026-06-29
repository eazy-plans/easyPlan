-- ============================================================
-- Venue Cancellation Policy Configuration
-- ============================================================

-- Create enum for cancellation policy types
CREATE TYPE cancellation_policy_type AS ENUM ('flexible', 'moderate', 'strict', 'custom');

-- Add cancellation policy fields to venues table
ALTER TABLE venues ADD COLUMN cancellation_policy_type cancellation_policy_type NOT NULL DEFAULT 'moderate';
ALTER TABLE venues ADD COLUMN cancellation_deadline_days integer NOT NULL DEFAULT 7;
ALTER TABLE venues ADD COLUMN cancellation_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00;
ALTER TABLE venues ADD COLUMN refund_details text;

-- Add constraint: fee percent between 0 and 100
ALTER TABLE venues ADD CONSTRAINT check_cancellation_fee_percent
  CHECK (cancellation_fee_percent >= 0 AND cancellation_fee_percent <= 100);

-- Add constraint: deadline days should be positive
ALTER TABLE venues ADD CONSTRAINT check_cancellation_deadline_days
  CHECK (cancellation_deadline_days > 0);

-- Add constraint: refund_details should be provided for custom policies
ALTER TABLE venues ADD CONSTRAINT check_custom_policy_details
  CHECK (cancellation_policy_type != 'custom' OR refund_details IS NOT NULL);
