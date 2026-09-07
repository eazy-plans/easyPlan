import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Best-effort write to audit_log (033) - never blocks or fails the caller's
 * primary action. actor_id must be an explicit argument (not auth.uid()
 * inside the query) so service-role callers, which have no auth session,
 * can still attribute the entry to the user who triggered it.
 */
export function logAudit(
  supabase: SupabaseClient,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  diff?: Record<string, unknown> | null,
): void {
  supabase.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    diff: diff ?? null,
  }).then(() => null, () => null);
}
