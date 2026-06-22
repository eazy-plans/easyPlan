-- ============================================================
-- Align email_type enum with the values the app actually writes
-- ============================================================
-- The app logs 'owner_event_created' (events/notify) and 'waitlist_notify'
-- (events/cancel), neither of which existed in the original enum - those inserts
-- were failing. 'owner_request' from the initial schema is unused by the code.

ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'owner_event_created';
ALTER TYPE email_type ADD VALUE IF NOT EXISTS 'waitlist_notify';
