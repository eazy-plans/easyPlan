-- ============================================================
-- Cancellation requests: events the client wants to cancel but
-- that must stay booked until a replacement client takes the
-- slot. The event keeps occupying its slot (events_slot_unique
-- still applies) - this only flags it for the
-- pending-cancellation tab; the actual cancellation still goes
-- through /api/events/cancel when a replacement shows up.
-- ============================================================

alter table events add column cancellation_requested_at timestamptz;

create index idx_events_cancellation_requested
  on events(cancellation_requested_at)
  where cancellation_requested_at is not null;
