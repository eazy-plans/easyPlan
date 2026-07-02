-- ============================================================
-- Block venue owners from approving their own venues
-- ============================================================
-- Migration 016 added the admin approval workflow, but RLS policies are
-- permissive (OR-ed together) and venues_update (001) still lets an owner
-- update every column of their own venue rows. RLS is row-level, not
-- column-level, so an owner could set approval_status='approved' (and forge
-- approved_by / approved_at) with a direct PostgREST call, bypassing review
-- and making the venue visible to secretaries and bookable.
--
-- Same guard pattern as enforce_event_pricing (007): non-admins keep editing
-- their venue freely, but the approval columns only move under an admin
-- session or a trusted context (auth.uid() is null - service role, SQL).

create or replace function enforce_venue_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and current_user_role() is distinct from 'admin' then
    if new.approval_status  is distinct from old.approval_status
       or new.approved_by      is distinct from old.approved_by
       or new.approved_at      is distinct from old.approved_at
       or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Only admins may change venue approval';
    end if;
  end if;

  return new;
end;
$$;

create trigger venues_approval_guard
  before update on venues
  for each row execute function enforce_venue_approval();
