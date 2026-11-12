"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendSecurityAlert } from "@/lib/email/securityAlert";
import { formatDateTime } from "@/lib/utils";

const FAILED_LOGIN_THRESHOLD = 10;
const FAILED_LOGIN_WINDOW_MINUTES = 15;

/**
 * Records a failed login attempt (reg. 10) - there is no session yet, so this
 * runs under the service role rather than the signed-in user's RLS context.
 * The insert is awaited directly (not via the fire-and-forget logAudit
 * helper) because the threshold check right after it depends on the row
 * already being committed.
 */
export async function recordLoginFailure(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return;

  const admin = createAdminClient();

  try {
    const { data: matchedUser } = await admin.from("users")
      .select("id, full_name, email")
      .ilike("email", trimmed)
      .maybeSingle();

    await admin.from("audit_log").insert({
      actor_id: null,
      action: "auth.login_failed",
      entity_type: "user",
      entity_id: matchedUser?.id ?? null,
      diff: { email: trimmed },
    });

    if (!matchedUser) return;

    const since = new Date(Date.now() - FAILED_LOGIN_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await admin.from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "auth.login_failed")
      .eq("entity_id", matchedUser.id)
      .gte("created_at", since);

    // Edge-triggered: alert exactly once when the count crosses the
    // threshold, not on every attempt after it.
    if (count === FAILED_LOGIN_THRESHOLD) {
      await sendSecurityAlert({
        heading: "ריבוי כשלי התחברות",
        intro: "זוהו כשלי התחברות חזרתיים לחשבון.",
        rows: [{
          title: "כשלי התחברות",
          account: `${matchedUser.full_name} (${matchedUser.email})`,
          detail: `${count} כשלים בתוך ${FAILED_LOGIN_WINDOW_MINUTES} דקות`,
          occurredAt: formatDateTime(new Date()),
        }],
      });
    }
  } catch (err) {
    console.error("recordLoginFailure error:", err);
  }
}
