import { createClient } from "@supabase/supabase-js";
import { getUserProfile } from "@/lib/supabase/queries";
import { UsersManager } from "@/components/settings/UsersManager";

export async function SettingsContent() {
  const { supabase, user } = await getUserProfile();

  const { data: users } = await supabase.from("users")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  // banned_until lives only in auth.users, which PostgREST can't read - it has
  // to come from the GoTrue admin API. Safe here: settings/page.tsx already
  // redirects anyone who isn't an admin before this component renders.
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: authData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const blockedIds = new Set(
    (authData?.users ?? [])
      .filter((u) => u.banned_until && new Date(u.banned_until) > new Date())
      .map((u) => u.id)
  );

  const rows = (users ?? []).map((u) => ({ ...u, blocked: blockedIds.has(u.id) }));

  return <UsersManager users={rows} currentUserId={user.id} />;
}
