-- ============================================================
-- Event Changelog: Track creator and who cancelled the event
-- ============================================================

-- Add cancelled_by field to track who cancelled the event
ALTER TABLE events ADD COLUMN cancelled_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for cancelled_by queries
CREATE INDEX idx_events_cancelled_by ON events(cancelled_by) WHERE cancelled_by IS NOT NULL;
