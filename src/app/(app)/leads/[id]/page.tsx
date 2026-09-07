import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { LeadDetailTabs } from "@/components/leads/LeadDetailTabs";
import type { EventRow } from "@/types/database";

export const metadata = { title: "פרטי ליד" };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getUserProfile();

  if (!["admin", "secretary"].includes(profile.role)) {
    redirect("/");
  }

  const { data: lead, error } = await supabase.from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    notFound();
  }

  const { data: inquiries } = await supabase.from("lead_inquiries")
    .select("*, venue:venues(id, name)")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const { data: phones } = await supabase.from("lead_phones")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });

  // events.lead_id (031) is the reliable link, set at booking time - phone/
  // email matching is only a fallback for events booked before that column
  // existed, or where the contact used a different phone than the lead's.
  // Cancelled events are included - the statistics tab breaks them out, and
  // the card shows a "בוטל" badge.
  type EventWithVenue = EventRow & { venue: { id: string; name: string } | null };
  const [byLeadId, byPhone, byEmail] = await Promise.all([
    supabase.from("events").select("*, venue:venues(id, name)").eq("lead_id", id),
    lead.client_phone
      ? supabase.from("events").select("*, venue:venues(id, name)").is("lead_id", null).eq("client_phone", lead.client_phone)
      : Promise.resolve({ data: [] as EventWithVenue[] }),
    lead.client_email
      ? supabase.from("events").select("*, venue:venues(id, name)").is("lead_id", null).eq("client_email", lead.client_email)
      : Promise.resolve({ data: [] as EventWithVenue[] }),
  ]);
  const eventsById = new Map<string, EventWithVenue>();
  for (const row of [...(byLeadId.data ?? []), ...(byPhone.data ?? []), ...(byEmail.data ?? [])] as EventWithVenue[]) {
    eventsById.set(row.id, row);
  }
  const eventsData = [...eventsById.values()].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-4xl mx-auto w-full">
      <LeadDetailTabs
        lead={lead}
        inquiries={inquiries ?? []}
        events={eventsData}
        phones={phones ?? []}
        isAdmin={profile.role === "admin"}
      />
    </div>
  );
}
