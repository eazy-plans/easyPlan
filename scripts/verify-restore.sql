-- Restore-test verification queries (docs/restore-test.md).
--
-- Run this file as-is against ONE database at a time (the SQL editor or
-- `psql "$DATABASE_URL" -f scripts/verify-restore.sql`), once against the
-- source and once against the restored target. There is no connection
-- string in this file on purpose — it runs against whichever database
-- you're already connected to. Save both outputs and diff them by hand
-- per docs/restore-test.md.

-- 1. Row counts per table.
select 'users' as table_name, count(*) from users
union all select 'venues', count(*) from venues
union all select 'venue_images', count(*) from venue_images
union all select 'events', count(*) from events
union all select 'leads', count(*) from leads
union all select 'lead_venue_interests', count(*) from lead_venue_interests
union all select 'booking_locks', count(*) from booking_locks
union all select 'email_logs', count(*) from email_logs
union all select 'waitlist', count(*) from waitlist
union all select 'audit_log', count(*) from audit_log
union all select 'lead_inquiries', count(*) from lead_inquiries
union all select 'lead_phones', count(*) from lead_phones
order by table_name;

-- 2. Latest record in leads and events.
select 'leads' as table_name, max(created_at) as latest_created_at from leads
union all
select 'events', max(created_at) from events;

-- 3. RLS enabled + policy count per table. Flag any row with
--    rls_enabled = false or policy_count = 0.
select
  t.tablename as table_name,
  t.rowsecurity as rls_enabled,
  count(p.policyname) as policy_count
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
  and t.tablename in (
    'users', 'venues', 'venue_images', 'events', 'leads',
    'lead_venue_interests', 'booking_locks', 'email_logs', 'waitlist',
    'audit_log', 'lead_inquiries', 'lead_phones'
  )
group by t.tablename, t.rowsecurity
order by t.tablename;

-- 4. Existence of critical functions and triggers. Flag any row with
--    exists = false.
select 'function: handle_new_user' as object, exists (
  select 1 from pg_proc where proname = 'handle_new_user'
) as exists
union all
select 'function: set_updated_at', exists (
  select 1 from pg_proc where proname = 'set_updated_at'
)
union all
select 'function: acquire_booking_lock', exists (
  select 1 from pg_proc where proname = 'acquire_booking_lock'
)
union all
select 'function: create_event_with_replacement', exists (
  select 1 from pg_proc where proname = 'create_event_with_replacement'
)
union all
select 'function: current_user_role', exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'current_user_role' and n.nspname = 'public'
)
union all
select 'trigger: events_pricing_check', exists (
  select 1 from pg_trigger where tgname = 'events_pricing_check'
)
union all
select 'trigger: users_role_guard', exists (
  select 1 from pg_trigger where tgname = 'users_role_guard'
)
union all
select 'trigger: venues_approval_guard', exists (
  select 1 from pg_trigger where tgname = 'venues_approval_guard'
);
