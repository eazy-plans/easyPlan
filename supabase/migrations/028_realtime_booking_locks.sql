-- ============================================================
-- Broadcast booking_locks changes over Realtime
-- ============================================================
-- StepSearch subscribes to postgres_changes on booking_locks so other
-- users' holds appear instantly (the 30s poll stays as fallback and is
-- what expires stale holds). Postgres only emits change events for
-- tables in the supabase_realtime publication - this adds the table.
--
-- RLS still applies to the delivered events: booking_locks_select allows
-- admin/secretary, which is exactly who uses the booking search.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'booking_locks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_locks;
  END IF;
END $$;
