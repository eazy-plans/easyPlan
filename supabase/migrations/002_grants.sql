-- ============================================================
-- Explicit Data API grants for public schema tables
-- Required ahead of Supabase enforcement on 2026-10-30
-- RLS policies (001_initial_schema.sql) still control row access
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.venues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.venue_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lead_venue_interests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.booking_locks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.waitlist TO authenticated;
