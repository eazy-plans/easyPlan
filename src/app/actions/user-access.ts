"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit";
import { sendSecurityAlert } from "@/lib/email/securityAlert";
import { formatDateTime } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "מנהל",
  secretary: "מזכירה",
  venue_owner: "בעל אולם",
};

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

  if (error) {
    console.error("setUserAccess: updateUserById failed:", error);
    return { error: "פעולת החסימה נכשלה, נסו שוב" };
  }

  const { data: targetUser } = await adminClient.from("users").select("full_name, email").eq("id", userId).maybeSingle();
  logAudit(supabase, blocked ? "user.block" : "user.unblock", "user", userId, {
    full_name: targetUser?.full_name ?? userId,
  });

  sendSecurityAlert({
    heading: blocked ? "חסימת גישה למשתמש" : "שחזור גישה למשתמש",
    intro: "זוהה שינוי גישה למשתמש במערכת.",
    rows: [{
      title: blocked ? "חסימת גישה" : "שחזור גישה",
      account: targetUser ? `${targetUser.full_name} (${targetUser.email})` : userId,
      occurredAt: formatDateTime(new Date()),
    }],
  });

  return { ok: true };
}

export async function notifyRoleChange(userId: string, fromRole: UserRole, toRole: UserRole) {
  if (fromRole === toRole) return;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase.from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return;

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: targetUser } = await adminClient.from("users").select("full_name, email, role").eq("id", userId).maybeSingle();
  // Confirm the role actually changed server-side before alerting - the
  // client-supplied fromRole/toRole are only used for the email's wording.
  if (!targetUser || targetUser.role !== toRole) return;

  sendSecurityAlert({
    heading: "שינוי הרשאה למשתמש",
    intro: "זוהה שינוי תפקיד למשתמש במערכת.",
    rows: [{
      title: "שינוי הרשאה",
      account: `${targetUser.full_name} (${targetUser.email})`,
      detail: `${ROLE_LABELS[fromRole]} ← ${ROLE_LABELS[toRole]}`,
      occurredAt: formatDateTime(new Date()),
    }],
  });
}
