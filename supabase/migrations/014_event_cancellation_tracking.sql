-- ============================================================
-- Event Cancellation and Refund Tracking
-- ============================================================

-- Add cancellation tracking fields to events table
ALTER TABLE events ADD COLUMN cancelled_at timestamptz;
ALTER TABLE events ADD COLUMN cancellation_reason text;
ALTER TABLE events ADD COLUMN refund_amount numeric(10,2);
ALTER TABLE events ADD COLUMN refund_date timestamptz;
ALTER TABLE events ADD COLUMN original_price_final numeric(10,2);

-- Add constraint: refund_amount should not be negative
ALTER TABLE events ADD CONSTRAINT check_refund_amount_positive
  CHECK (refund_amount IS NULL OR refund_amount >= 0);

-- Add constraint: refund_date only when cancelled
ALTER TABLE events ADD CONSTRAINT check_refund_date_with_cancellation
  CHECK (cancelled_at IS NULL OR refund_date IS NOT NULL);

-- Add constraint: original_price_final only when cancelled
ALTER TABLE events ADD CONSTRAINT check_original_price_with_cancellation
  CHECK (cancelled_at IS NULL OR original_price_final IS NOT NULL);

-- Create index for cancelled events queries
CREATE INDEX idx_events_cancelled_at ON events(cancelled_at) WHERE cancelled_at IS NOT NULL;
CREATE INDEX idx_events_status_cancelled ON events(status, cancelled_at);
