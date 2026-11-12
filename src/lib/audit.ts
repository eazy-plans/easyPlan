import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Best-effort write to audit_log (033/038) - never blocks or fails the
 * caller's primary action. Calls the log_audit_event() SECURITY DEFINER
 * function (038), which derives actor_id from auth.uid() on the server;
 * there is no actor id argument here because the caller must never be able
 * to assert who performed the action. Pass the signed-in user's own
 * session-bound client, not a service-role/admin client - auth.uid() would
 * resolve to null there and the write would be rejected.
 */
export function logAudit(
  supabase: SupabaseClient,
  action: string,
  entityType: string,
  entityId?: string | null,
  diff?: Record<string, unknown> | null,
): void {
  supabase.rpc("log_audit_event", {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId ?? null,
    p_diff: diff ?? null,
  }).then(() => null, () => null);
}
