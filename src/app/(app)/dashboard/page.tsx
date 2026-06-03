/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { DashboardStatsClient } from "@/components/dashboard/DashboardStatsClient";
import { YearPicker } from "@/components/dashboard/YearPicker";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { supabase, user, profile } = await getUserProfile();

  if (profile.role === "secretary") redirect("/events");

  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Math.min(
    currentYear,
    Math.max(2000, yearParam ? parseInt(yearParam, 10) : currentYear)
  );

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const isOwner = profile.role === "venue_owner";

  // For owners, scope all queries to their venues only
  let ownerVenueIds: string[] | null = null;
  if (isOwner) {
    const { data: ownerVenues } = await (supabase.from("venues") as any)
      .select("id")
      .eq("owner_user_id", user.id)
      .eq("is_active", true);
    ownerVenueIds = (ownerVenues ?? []).map((v: { id: string }) => v.id);
  }

  let eventsQuery = (supabase.from("events") as any)
    .select("id, date, event_type, status, price_final, venue_id, venue:venues(name)")
    .gte("date", yearStart)
    .lte("date", yearEnd)
    .neq("status", "cancelled");
  if (ownerVenueIds) eventsQuery = eventsQuery.in("venue_id", ownerVenueIds);

  let venuesQuery = (supabase.from("venues") as any).select("id, name").eq("is_active", true);
  if (isOwner) venuesQuery = venuesQuery.eq("owner_user_id", user.id);

  const [{ data: events }, { data: leads }, { data: venues }] = await Promise.all([
    eventsQuery,
    isOwner ? Promise.resolve({ data: [] }) : (supabase.from("leads") as any).select("id, status"),
    venuesQuery,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">סקירה כללית</h1>
          <p className="text-sm text-muted-foreground mt-0.5">נתוני שנת {year}</p>
        </div>
        <YearPicker year={year} />
      </div>
      <DashboardStatsClient
        events={events ?? []}
        leads={leads ?? []}
        venues={venues ?? []}
        hideLeads={isOwner}
      />
    </div>
  );
}
