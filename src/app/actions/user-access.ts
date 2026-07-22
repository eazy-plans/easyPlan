"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// venues.owner_user_id and events.created_by are ON DELETE RESTRICT, so a user
// with any history can never be hard-deleted. "Removing access" is therefore a
// Supabase auth ban: sign-in and token refresh are rejected while all of the
// user's data stays intact. GoTrue has no permanent-ban flag, so block with a
// ~100-year duration; "none" lifts it. An already-issued JWT stays valid until
// it expires (~1h), after which the user is locked out.
const BLOCK_DURATION = "876000h";

export async function setUserAccess(userId: string, blocked: boolean) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "אין הרשאה" };
  if (blocked && user.id === userId) return { error: "לא ניתן לחסום את הגישה של עצמך" };

  const { data: profile } = await supabase.from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "אין הרשאה לפעולה זו" };

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? BLOCK_DURATION : "none",
  });

  if (error) return { error: error.message };
  return { ok: true };
}
