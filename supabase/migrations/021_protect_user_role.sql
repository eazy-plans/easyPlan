-- ============================================================
-- Block self-service role escalation
-- ============================================================
-- users_update_own (001) lets every user update their own row and the 002
-- grants cover every column, so nothing stopped a secretary or venue owner
-- from setting role='admin' on themselves via a direct PostgREST call. Every
-- RLS policy derives from current_user_role(), so that one UPDATE was a full
-- privilege escalation.
--
-- Enforced here as a trigger rather than a column-level REVOKE because the
-- admin users screen (UsersManager) legitimately updates roles client-side
-- from an admin session - revoking the column grant would break it.
--
--   * admins may change any user's role (their own included)
--   * other authenticated users may never change a role
--   * service-role / migration contexts (auth.uid() is null) stay unrestricted

create or replace function enforce_user_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for service-role and direct SQL sessions; those are
  -- trusted. "is distinct from" also blocks callers with no users row (null
  -- role), which a plain <> comparison would silently let through.
  if auth.uid() is not null and current_user_role() is distinct from 'admin' then
    raise exception 'Only admins may change user roles';
  end if;

  return new;
end;
$$;

create trigger users_role_guard
  before update on users
  for each row
  when (old.role is distinct from new.role)
  execute function enforce_user_role_change();
