/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { UsersManager } from "@/components/settings/UsersManager";

export async function SettingsContent() {
  const { supabase, user } = await getUserProfile();

  const { data: users } = await (supabase.from("users") as any)
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  return <UsersManager users={users ?? []} currentUserId={user.id} />;
}
