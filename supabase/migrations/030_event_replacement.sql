-- ============================================================
-- Event replacement: link a cancelled event to the booking that
-- replaced it, plus an atomic RPC that performs the cancel-and-rebook
-- in one transaction.
-- ============================================================
-- Booking a slot occupied by a cancellation_requested_at event (029)
-- used to fail outright on events_slot_unique. This lets the new
-- booking automatically cancel the flagged event and link the two.

alter table events add column replaced_by_event_id uuid references events(id) on delete set null;

create index idx_events_replaced_by on events(replaced_by_event_id) where replaced_by_event_id is not null;

-- New email types for the two notifications this scenario sends (the
-- displaced client, and the venue owner) - kept distinct from the regular
-- event_cancelled/owner_event_created types so email_logs can tell them apart.
alter type email_type add value if not exists 'event_replaced';
alter type email_type add value if not exists 'owner_event_replaced';

-- Atomic cancel-and-rebook: if a pending-cancellation event already
-- occupies the slot, cancel it first (dropping it out of the
-- events_slot_unique partial index) and link it, then insert the new
-- booking - all inside one function call so no window exists where a
-- check-then-insert from the client could race another session into
-- events_slot_unique. Also the new single entry point for booking
-- creation generally (replaces the old direct client-side insert).
create or replace function create_event_with_replacement(
  p_venue_id uuid,
  p_date date,
  p_event_type event_type,
  p_event_purpose event_purpose,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_price_listed numeric,
  p_discount_amount numeric,
  p_price_final numeric,
  p_notes text,
  p_created_by uuid
) returns table (event_id uuid, replaced_event_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_event_id uuid;
  v_new_event_id uuid;
begin
  -- security definer bypasses RLS, so mirror the events_insert policy here.
  if current_user_role() not in ('admin', 'secretary') then
    raise exception 'not authorized';
  end if;

  -- Lock the slot's pending-cancellation event (if any) so two concurrent
  -- bookings targeting the same freed slot serialize instead of both
  -- racing to cancel/replace it.
  select id into v_old_event_id
  from events
  where venue_id = p_venue_id
    and date = p_date
    and event_type = p_event_type
    and status <> 'cancelled'
    and cancellation_requested_at is not null
  for update;

  if v_old_event_id is not null then
    update events
    set status = 'cancelled',
        cancelled_at = now(),
        cancelled_by = p_created_by,
        cancellation_reason = 'הוחלף בהזמנה חדשה לאותו תאריך',
        original_price_final = coalesce(original_price_final, price_final)
    where id = v_old_event_id;
  end if;

  insert into events (
    venue_id, date, event_type, event_purpose, status,
    client_name, client_phone, client_email,
    price_listed, discount_amount, price_final, notes,
    booking_date, created_by
  ) values (
    p_venue_id, p_date, p_event_type, p_event_purpose, 'approved',
    p_client_name, p_client_phone, p_client_email,
    p_price_listed, p_discount_amount, p_price_final, p_notes,
    now(), p_created_by
  ) returning id into v_new_event_id;

  if v_old_event_id is not null then
    update events set replaced_by_event_id = v_new_event_id where id = v_old_event_id;
  end if;

  return query select v_new_event_id, v_old_event_id;
end;
$$;

revoke all on function create_event_with_replacement(uuid, date, event_type, event_purpose, text, text, text, numeric, numeric, numeric, text, uuid) from public;
grant execute on function create_event_with_replacement(uuid, date, event_type, event_purpose, text, text, text, numeric, numeric, numeric, text, uuid) to authenticated;
