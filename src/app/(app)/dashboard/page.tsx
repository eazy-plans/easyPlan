/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { DashboardStatsClient } from "@/components/dashboard/DashboardStatsClient";

export default async function DashboardPage() {
  const { supabase, profile } = await getUserProfile();

  if (profile.role === "secretary") redirect("/events");
  if (profile.role === "venue_owner") redirect("/calendar");

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;


  const [{ data: events }, { data: leads }, { data: venues }] = await Promise.all([
    (supabase.from("events") as any)
      .select("id, date, event_type, status, price_final, venue_id, venue:venues(name)")
      .gte("date", yearStart)
      .lte("date", yearEnd)
      .neq("status", "cancelled"),
  
    (supabase.from("leads") as any).select("id, status"),
  
    (supabase.from("venues") as any).select("id, name").eq("is_active", true),
  ]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">דשבורד — {currentYear}</h1>
      <DashboardStatsClient
        events={events ?? []}
        leads={leads ?? []}
        venues={venues ?? []}
      />

    </div>
  );
}
