-- Add approval workflow to venues table
alter table venues add column approval_status text not null default 'pending';
alter table venues add column approved_by uuid references users(id) on delete set null;
alter table venues add column approved_at timestamptz;
alter table venues add column rejection_reason text;

-- Create index for filtering pending venues
create index venues_approval_status_idx on venues(approval_status);

-- Update RLS policy for venues to respect approval status
drop policy if exists "venues_select" on venues;

create policy "venues_select" on venues
  for select using (
    current_user_role() = 'admin'
    or (approval_status = 'approved' and current_user_role() in ('secretary'))
    or owner_user_id = auth.uid()
  );

-- Admins can approve/reject venues
create policy "venues_update_approval" on venues
  for update using (
    current_user_role() = 'admin'
  );
