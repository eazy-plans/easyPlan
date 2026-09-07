-- ============================================================
-- Admin-only audit log
-- ============================================================
-- Generic log of who changed what, in the same spirit as the existing
-- cancelled_by tracking on events (017) but not tied to one table.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_entity on audit_log(entity_type, entity_id);
create index idx_audit_log_created_at on audit_log(created_at desc);

alter table audit_log enable row level security;

create policy "audit_log_select_admin" on audit_log
  for select using (current_user_role() = 'admin');

-- Any signed-in user may log their own actions; only admins may read the log.
create policy "audit_log_insert_self" on audit_log
  for insert with check (actor_id = auth.uid());
