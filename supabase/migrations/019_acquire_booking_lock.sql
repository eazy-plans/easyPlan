-- ============================================================
-- Atomic booking-lock acquisition
-- ============================================================
-- Step5BookingForm used to check for an existing lock and then upsert. That
-- check-then-write pair is not atomic: two secretaries could both pass the
-- check and the second upsert silently stole the first one's lock. The
-- events_slot_unique index still prevented double BOOKING, but the lock UI
-- lied about who held the slot.
--
-- This function does the whole acquisition in a single statement: the insert
-- takes the slot if it's free, and the ON CONFLICT update only succeeds when
-- the existing lock is expired or already ours. Returns true when the caller
-- holds the lock afterwards, false when someone else does.

create or replace function acquire_booking_lock(
  p_venue_id uuid,
  p_date date,
  p_event_type event_type,
  p_minutes integer default 10
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- security definer bypasses RLS, so mirror the booking_locks_insert policy here.
  if current_user_role() not in ('admin', 'secretary') then
    return false;
  end if;

  insert into booking_locks (venue_id, date, event_type, locked_by_user_id, locked_until)
  values (
    p_venue_id,
    p_date,
    p_event_type,
    auth.uid(),
    now() + make_interval(mins => least(greatest(p_minutes, 1), 30))
  )
  on conflict (venue_id, date, event_type) do update
    set locked_by_user_id = excluded.locked_by_user_id,
        locked_until      = excluded.locked_until
    where booking_locks.locked_until < now()
       or booking_locks.locked_by_user_id = excluded.locked_by_user_id
  returning id into v_id;

  return v_id is not null;
end;
$$;

revoke all on function acquire_booking_lock(uuid, date, event_type, integer) from public;
grant execute on function acquire_booking_lock(uuid, date, event_type, integer) to authenticated;
