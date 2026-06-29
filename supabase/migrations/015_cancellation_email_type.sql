-- ============================================================
-- Add Event Cancellation Email Type
-- ============================================================

-- Add new email type for cancellation notices
ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'event_cancelled';
