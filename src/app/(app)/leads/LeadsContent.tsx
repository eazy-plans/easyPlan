import { getUserProfile } from "@/lib/supabase/queries";
import { LeadsTabs } from "@/components/leads/LeadsTabs";
import { eventsHistoryCutoffStr } from "@/lib/utils";
import type { TimelineEntry } from "@/components/leads/LeadsTimeline";

export async function LeadsContent({ initialSearch }: { initialSearch?: string }) {
  const { supabase } = await getUserProfile();

  // Newest 500 leads - the list filters client-side, and unbounded fetches
  // degrade as history accumulates. Older leads are still reachable through
  // the lead card dialog (looked up by phone) and the events page.
  const leadsPromise = supabase.from("leads")
    .select("id, client_name, client_phone, client_email, status, created_at, updated_at, notes")
    .order("created_at", { ascending: false })
    .limit(500);

  // L2: chronological feed of inquiries (not yet booked) and orders
  // (events), each bounded the same way the rest of the app bounds history.
  const inquiriesPromise = supabase.from("lead_inquiries")
    .select("id, status, created_at, lead:leads(id, client_name), venue:venues(name)")
    .neq("status", "booked")
    .order("created_at", { ascending: false })
    .limit(300);
  const ordersPromise = supabase.from("events")
    .select("id, status, created_at, client_name, lead_id, venue:venues(name)")
    .gte("date", eventsHistoryCutoffStr())
    .order("created_at", { ascending: false })
    .limit(300);

  const [{ data: leads, error }, { data: inquiries }, { data: orders }] = await Promise.all([
    leadsPromise, inquiriesPromise, ordersPromise,
  ]);
  if (error) throw new Error(`Failed to load leads: ${error.message}`);

  const timelineEntries: TimelineEntry[] = [
    ...(inquiries ?? []).map((i) => ({
      id: i.id,
      kind: "inquiry" as const,
      createdAt: i.created_at,
      leadId: i.lead?.id ?? null,
      leadName: i.lead?.client_name ?? "-",
      venueName: i.venue?.name ?? null,
      status: i.status,
    })),
    ...(orders ?? []).map((o) => ({
      id: o.id,
      kind: "order" as const,
      createdAt: o.created_at,
      leadId: o.lead_id,
      leadName: o.client_name,
      venueName: o.venue?.name ?? null,
      status: o.status,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return <LeadsTabs leads={leads ?? []} initialSearch={initialSearch} timelineEntries={timelineEntries} />;
}
