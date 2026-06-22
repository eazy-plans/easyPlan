import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. This BYPASSES Row Level Security.
 *
 * Only ever use it in server-only code (route handlers, server actions) and
 * only AFTER you have authenticated/authorized the caller yourself, or in a
 * trusted context such as a cron job guarded by CRON_SECRET. Never import this
 * into a Client Component - the service role key must never reach the browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
