-- current_user_role() has been returning NULL for valid authenticated
-- sessions, causing every role-gated RLS policy (users/venues/events/leads/
-- booking_locks/etc.) to silently return zero rows for everyone. auth.uid()
-- itself resolves correctly (row-ownership checks like `id = auth.uid()`
-- work), so the function must be shadowed by a stray overload with a
-- different signature that isn't referenced by any policy (policies only
-- ever call the zero-arg form). Drop any such overloads and recreate the
-- canonical zero-arg definition in place (CREATE OR REPLACE keeps existing
-- policy dependencies intact — no policies are dropped or recreated here).

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'current_user_role'
      and n.nspname = 'public'
      and p.pronargs <> 0
  loop
    execute format('drop function %s', r.sig);
  end loop;
end $$;

create or replace function current_user_role()
returns user_role language sql security definer stable as $$
  select role from public.users where id = auth.uid()
$$;

-- In case the table owner lost the default RLS bypass at some point.
alter table users no force row level security;
alter table venues no force row level security;
alter table events no force row level security;

-- Force PostgREST to drop any stale cached function/schema plan.
select pg_notify('pgrst', 'reload schema');
