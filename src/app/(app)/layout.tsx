import { getUserProfile } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getUserProfile();

  return (
    <div className="flex h-screen">
      <Sidebar role={profile.role} fullName={profile.full_name} />
      <main className="flex-1 p-6 overflow-auto flex flex-col">{children}</main>
    </div>
  );
}
