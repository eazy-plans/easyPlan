-- Dummy data for a fresh dev/local database. NEVER run this against production.
--
-- Usage:
--   Local (Docker):  supabase db reset        (applies migrations, then this file)
--   Hosted dev project: after pushing migrations, run this file via the
--     Supabase SQL editor or `psql "$DATABASE_URL" -f supabase/seed.sql`.
--
-- Inserts three throwaway auth users (one per role) so the existing
-- handle_new_user() trigger populates public.users, plus one sample venue
-- and one sample lead. All emails/phones are fake.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'admin@example.test', crypt('dev-password-only', gen_salt('bf')),
   now(), '{"role":"admin"}', '{"full_name":"Dev Admin"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'secretary@example.test', crypt('dev-password-only', gen_salt('bf')),
   now(), '{"role":"secretary"}', '{"full_name":"Dev Secretary"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'owner@example.test', crypt('dev-password-only', gen_salt('bf')),
   now(), '{"role":"venue_owner"}', '{"full_name":"Dev Venue Owner"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into public.venues (
  id, name, address, city, max_capacity,
  price_morning, price_evening, owner_user_id, is_active
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'אולם דוגמה', 'רחוב הדוגמה 1', 'תל אביב',
  300, 5000, 8000, '33333333-3333-3333-3333-333333333333', true
) on conflict (id) do nothing;

insert into public.leads (
  id, client_name, client_phone, client_email, status
) values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'לקוח דוגמה', '0500000000', 'lead@example.test', 'new'
) on conflict (id) do nothing;
