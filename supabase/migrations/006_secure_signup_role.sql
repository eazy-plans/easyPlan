-- ============================================================
-- Harden role assignment on signup
-- ============================================================
-- Previously handle_new_user() read the role from raw_user_meta_data, which is
-- fully controlled by the client calling auth.signUp({ options: { data }}). That
-- let anyone self-register as 'admin'. app_metadata (raw_app_meta_data) can only
-- be set with the service-role key (the admin invite flow), so we read from there
-- and default everyone else to 'secretary'.

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role_text text;
  v_role user_role;
begin
  v_role_text := new.raw_app_meta_data->>'role';

  if v_role_text in ('admin', 'secretary', 'venue_owner') then
    v_role := v_role_text::user_role;
  else
    v_role := 'secretary';
  end if;

  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'משתמש חדש'),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
