-- ============================================================
-- audit_log: move writes behind a SECURITY DEFINER function
-- ============================================================
-- 033 let any signed-in user insert into audit_log as long as
-- actor_id = auth.uid() - but actor_id was still an argument the caller
-- (the app's logAudit() helper) supplied, with the RLS check only
-- confirming it matched the caller's own session. The actor should never
-- be a value passed in; it must be read server-side from the request's
-- own JWT.

alter table audit_log add column actor_type text not null default 'user';
alter table audit_log add constraint audit_log_actor_type_check
  check (actor_type in ('user', 'system'));

-- Only a real request with no auth.uid() (service_role) may log a system
-- action, and only when it explicitly opts in via p_system - a dropped
-- session or anon key never silently falls back to "system".
create or replace function log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_diff jsonb default null,
  p_system boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is not null then
    insert into audit_log (actor_id, actor_type, action, entity_type, entity_id, diff)
    values (v_actor_id, 'user', p_action, p_entity_type, p_entity_id, p_diff);
    return;
  end if;

  if p_system and auth.role() = 'service_role' then
    insert into audit_log (actor_id, actor_type, action, entity_type, entity_id, diff)
    values (null, 'system', p_action, p_entity_type, p_entity_id, p_diff);
    return;
  end if;

  raise exception 'log_audit_event: no authenticated user; service-role callers must pass p_system => true';
end;
$$;

revoke execute on function log_audit_event(text, text, uuid, jsonb, boolean) from public;
grant execute on function log_audit_event(text, text, uuid, jsonb, boolean) to authenticated, service_role;

-- Superseded by log_audit_event(), which no longer accepts actor_id as an
-- argument at all - the INSERT grant below is dropped next, so this policy
-- can never fire again.
drop policy "audit_log_insert_self" on audit_log;

revoke insert on audit_log from authenticated, anon;

-- Force PostgREST to drop any stale cached function/schema plan.
select pg_notify('pgrst', 'reload schema');
