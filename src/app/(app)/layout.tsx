import { getUserProfile } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await getUserProfile();

  // Badge on the admin notifications item: venues awaiting approval plus
  // events awaiting cancellation. Head-count queries only; errors degrade to
  // a missing badge instead of breaking every page in the segment.
  let notificationCount = 0;
  if (profile.role === "admin") {
    const [pendingVenues, pendingCancellations] = await Promise.all([
      supabase.from("venues")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending"),
      supabase.from("events")
        .select("id", { count: "exact", head: true })
        .not("cancellation_requested_at", "is", null)
        .neq("status", "cancelled"),
    ]);
    notificationCount = (pendingVenues.count ?? 0) + (pendingCancellations.count ?? 0);
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <Sidebar role={profile.role} fullName={profile.full_name} notificationCount={notificationCount} />
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
