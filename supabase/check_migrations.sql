-- Migration checklist: paste into the Supabase dashboard SQL editor.
-- Each row probes a schema object that only exists if that migration ran.
-- Expected result: every row "applied". Any "*** MISSING ***" row must be
-- applied (in numeric order) from supabase/migrations/.
--
-- Note on 013 vs 023: 023 replaces 013 (drops its columns and the
-- cancellation_policy_type enum). 013 counts as applied if either the old
-- enum still exists (023 not yet run) or the new free-text column exists
-- (023 ran, which requires 013 to have run first).
--
-- Note on 003 vs 034: 034 makes the venue-images bucket private and drops
-- 003's "public read venue images" policy, replacing it with scoped ones.
-- 003 counts as applied if either the old public-read policy still exists
-- (034 not yet run) or the new scoped select policy exists (034 ran, which
-- requires 003 to have run first).

with col as (
  select table_name, column_name, is_nullable
  from information_schema.columns
  where table_schema = 'public'
)
select migration,
       case when applied then 'applied' else '*** MISSING ***' end as status
from (values
  ('001_initial_schema',
    to_regclass('public.events') is not null),
  ('002_grants',
    has_table_privilege('authenticated', 'public.users', 'SELECT')),
  ('003_storage_venue_images (superseded by 034)',
    exists (select 1 from pg_policies where schemaname = 'storage'
            and policyname = 'public read venue images')
    or exists (select 1 from pg_policies where schemaname = 'storage'
               and policyname = 'venue_images_storage_select')),
  ('004_leads_secretary_access',
    exists (select 1 from pg_policies where schemaname = 'public'
            and tablename = 'leads' and policyname = 'leads_admin_secretary')),
  ('005_lead_status_extra_values',
    exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
            where t.typname = 'lead_status' and e.enumlabel = 'too_expensive')),
  ('006_secure_signup_role (see 035 - "exists" alone can''t tell the body apart from 001''s)',
    exists (select 1 from pg_proc where proname = 'handle_new_user')),
  ('007_enforce_event_pricing',
    exists (select 1 from pg_trigger where tgname = 'events_pricing_check')),
  ('008_email_type_values',
    exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
            where t.typname = 'email_type' and e.enumlabel = 'owner_event_created')),
  ('009_booking_locks_update_policy',
    exists (select 1 from pg_policies where schemaname = 'public'
            and tablename = 'booking_locks' and policyname = 'booking_locks_update')),
  ('010_lead_inquiries',
    to_regclass('public.lead_inquiries') is not null),
  ('011_venue_amenities',
    exists (select 1 from col where table_name = 'venues' and column_name = 'has_elevator')),
  ('012_event_booking_date',
    exists (select 1 from col where table_name = 'events' and column_name = 'booking_date')),
  ('013_venue_cancellation_policy (superseded by 023)',
    to_regtype('public.cancellation_policy_type') is not null
    or exists (select 1 from col where table_name = 'venues' and column_name = 'cancellation_policy')),
  ('014_event_cancellation_tracking',
    exists (select 1 from col where table_name = 'events' and column_name = 'cancelled_at')),
  ('015_cancellation_email_type',
    exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
            where t.typname = 'email_type' and e.enumlabel = 'event_cancelled')),
  ('016_venue_approval',
    exists (select 1 from col where table_name = 'venues' and column_name = 'approval_status')),
  ('017_event_changelog',
    exists (select 1 from col where table_name = 'events' and column_name = 'cancelled_by')),
  ('018_leads_optional_contact',
    coalesce((select is_nullable = 'YES' from col
              where table_name = 'leads' and column_name = 'client_phone'), false)),
  ('019_acquire_booking_lock',
    exists (select 1 from pg_proc where proname = 'acquire_booking_lock')),
  ('020_venue_coordinates',
    exists (select 1 from col where table_name = 'venues' and column_name = 'lat')),
  ('021_protect_user_role',
    exists (select 1 from pg_trigger where tgname = 'users_role_guard')),
  ('022_protect_venue_approval',
    exists (select 1 from pg_trigger where tgname = 'venues_approval_guard')),
  ('023_venue_cancellation_policy_free_text',
    exists (select 1 from col where table_name = 'venues' and column_name = 'cancellation_policy')),
  ('024_venue_contact',
    exists (select 1 from col where table_name = 'venues' and column_name = 'contact_name')),
  ('025_drop_refund_date_constraint',
    not exists (select 1 from pg_constraint
                where conname = 'check_refund_date_with_cancellation')),
  ('026_leads_unique_phone',
    exists (select 1 from pg_indexes where schemaname = 'public'
            and indexname = 'leads_client_phone_unique')),
  ('027_events_optional_client_email',
    coalesce((select is_nullable = 'YES' from col
              where table_name = 'events' and column_name = 'client_email'), false)),
  ('028_realtime_booking_locks',
    exists (select 1 from pg_publication_tables
            where pubname = 'supabase_realtime'
            and schemaname = 'public' and tablename = 'booking_locks')),
  ('029_event_cancellation_request',
    exists (select 1 from col where table_name = 'events'
            and column_name = 'cancellation_requested_at')),
  ('030_event_replacement',
    exists (select 1 from pg_proc where proname = 'create_event_with_replacement')),
  ('031_leads_direct_link',
    to_regclass('public.lead_phones') is not null),
  ('032_lead_inquiries_chronological',
    exists (select 1 from col where table_name = 'lead_inquiries' and column_name = 'source')),
  ('033_audit_log',
    to_regclass('public.audit_log') is not null),
  ('034_private_venue_images',
    coalesce((select public = false from storage.buckets where id = 'venue-images'), false)
    and exists (select 1 from pg_policies where schemaname = 'storage'
                and tablename = 'objects' and policyname = 'venue_images_storage_select')),
  ('035_reapply_signup_role_from_app_metadata',
    pg_get_functiondef('handle_new_user'::regproc) like '%raw_app_meta_data%'),
  ('036_fix_current_user_role_overload',
    not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where p.proname = 'current_user_role' and n.nspname = 'public'
                and p.pronargs <> 0)),
  ('037_venue_images_bucket_restrictions',
    coalesce((select file_size_limit = 5 * 1024 * 1024
              and allowed_mime_types = array['image/webp']
              from storage.buckets where id = 'venue-images'), false)),
  ('038_log_audit_event_function',
    exists (select 1 from pg_proc where proname = 'log_audit_event')
    and not exists (select 1 from information_schema.role_table_grants
                    where table_schema = 'public' and table_name = 'audit_log'
                    and grantee = 'authenticated' and privilege_type = 'INSERT'))
) as m(migration, applied)
order by migration;
