-- Live DB check (2026-11-07) found new invites landing as 'secretary'
-- regardless of the role chosen in the admin "הוסף משתמש" UI, even though
-- inviteUser() correctly sets app_metadata.role. handle_new_user() on the
-- live DB still reads raw_user_meta_data (001's original body) instead of
-- raw_app_meta_data - 006_secure_signup_role.sql never actually took effect
-- there. This re-applies 006's intended body; CREATE OR REPLACE makes it
-- safe to run whether or not 006 ran previously.

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
