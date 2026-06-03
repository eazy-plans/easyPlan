/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { UsersManager } from "@/components/settings/UsersManager";

export default async function SettingsPage() {
  const { supabase, user, profile } = await getUserProfile();

  if (profile.role !== "admin") redirect("/dashboard");


  const { data: users } = await (supabase.from("users") as any)
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">ניהול משתמשים</h1>
      <UsersManager users={users ?? []} currentUserId={user.id} />
    </div>
  );
}
