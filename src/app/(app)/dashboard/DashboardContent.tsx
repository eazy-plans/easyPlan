/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { DashboardStatsClient } from "@/components/dashboard/DashboardStatsClient";

export async function DashboardContent({
  year,
  userId,
  isOwner,
}: {
  year: number;
  userId: string;
  isOwner: boolean;
}) {
  const { supabase } = await getUserProfile();

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  let ownerVenueIds: string[] | null = null;
  if (isOwner) {
    const { data: ownerVenues } = await (supabase.from("venues") as any)
      .select("id")
      .eq("owner_user_id", userId)
      .eq("is_active", true);
    ownerVenueIds = (ownerVenues ?? []).map((v: { id: string }) => v.id);
  }

  let eventsQuery = (supabase.from("events") as any)
    .select("id, date, event_type, status, price_final, venue_id, venue:venues(name,city)")
    .gte("date", yearStart)
    .lte("date", yearEnd)
    .neq("status", "cancelled");
  if (ownerVenueIds) eventsQuery = eventsQuery.in("venue_id", ownerVenueIds);

  let venuesQuery = (supabase.from("venues") as any).select("id, name").eq("is_active", true);
  if (isOwner) venuesQuery = venuesQuery.eq("owner_user_id", userId);

  const [{ data: events }, { data: leads }, { data: venues }] = await Promise.all([
    eventsQuery,
    isOwner
      ? Promise.resolve({ data: [] })
      : (supabase.from("leads") as any).select("id, status"),
    venuesQuery,
  ]);

  return (
    <DashboardStatsClient
      events={events ?? []}
      leads={leads ?? []}
      venues={venues ?? []}
      hideLeads={isOwner}
    />
  );
}
