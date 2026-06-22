-- ============================================================
-- Allow refreshing / taking over booking locks
-- ============================================================
-- Step5BookingForm acquires the lock with an upsert (INSERT ... ON CONFLICT DO
-- UPDATE). When a row already exists for the slot (the holder's own lock, or
-- someone else's expired lock the app has decided is free), the UPDATE branch
-- needs an UPDATE policy - there was none, so the refresh silently failed under
-- RLS. WITH CHECK keeps a user from writing a lock owned by someone else.

create policy "booking_locks_update" on booking_locks
  for update
  using (current_user_role() in ('admin', 'secretary'))
  with check (locked_by_user_id = auth.uid());
