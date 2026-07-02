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
    const { data: ownerVenues, error: ownerVenuesError } = await (supabase.from("venues") as any)
      .select("id")
      .eq("owner_user_id", userId)
      .eq("is_active", true);
    if (ownerVenuesError) throw new Error(`Failed to load venues: ${ownerVenuesError.message}`);
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

  const [eventsRes, leadsRes, venuesRes, inquiriesRes] = await Promise.all([
    eventsQuery,
    isOwner
      ? Promise.resolve({ data: [], error: null })
      : (supabase.from("leads") as any).select("id, status"),
    venuesQuery,
    isOwner
      ? Promise.resolve({ data: [], error: null })
      : (supabase.from("lead_inquiries") as any)
          .select("id, lead_id, venue_id, status, leads(client_name), venues(name)")
          .in("status", ["considering", "waiting_for_date"]),
  ]);

  for (const [label, res] of [["events", eventsRes], ["leads", leadsRes], ["venues", venuesRes], ["inquiries", inquiriesRes]] as const) {
    if (res.error) throw new Error(`Failed to load ${label}: ${res.error.message}`);
  }
  const { data: events } = eventsRes;
  const { data: leads } = leadsRes;
  const { data: venues } = venuesRes;
  const { data: pendingInquiries } = inquiriesRes;

  return (
    <DashboardStatsClient
      events={events ?? []}
      leads={leads ?? []}
      venues={venues ?? []}
      pendingInquiries={pendingInquiries ?? []}
      hideLeads={isOwner}
    />
  );
}
