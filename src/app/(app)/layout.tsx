import { getUserProfile } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getUserProfile();

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <Sidebar role={profile.role} fullName={profile.full_name} />
      <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden flex flex-col">{children}</main>
    </div>
  );
}
