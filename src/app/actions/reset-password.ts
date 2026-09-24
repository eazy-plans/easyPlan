"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit";

export async function resetUserPassword(userId: string, password: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "אין הרשאה" };

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

  const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };

  const { data: targetUser } = await adminClient.from("users").select("full_name").eq("id", userId).maybeSingle();
  logAudit(adminClient, user.id, "user.reset_password", "user", userId, {
    full_name: targetUser?.full_name ?? userId,
  });

  return { ok: true };
}
