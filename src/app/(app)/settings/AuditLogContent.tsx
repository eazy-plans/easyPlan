import { getUserProfile } from "@/lib/supabase/queries";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";

export async function AuditLogContent() {
  const { supabase } = await getUserProfile();

  const { data, error } = await supabase.from("audit_log")
    .select("id, action, entity_type, entity_id, diff, created_at, actor:users(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  // 42P01 = undefined table: migration 033 (audit_log) has not been applied
  // yet. Degrade to a banner rather than a hard error.
  const migrationMissing = error?.code === "42P01";
  if (error && !migrationMissing) {
    throw new Error(`Failed to load audit log: ${error.message}`);
  }

  return <AuditLogViewer entries={data ?? []} migrationMissing={migrationMissing} />;
}
