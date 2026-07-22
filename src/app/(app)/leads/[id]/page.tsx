import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { LeadDetailTabs } from "@/components/leads/LeadDetailTabs";

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

  // Leads are keyed by phone (client_email is optional on both sides), so
  // match bookings by phone first. Cancelled events are included - the
  // statistics tab breaks them out, and the card shows a "בוטל" badge.
  let eventsQuery = null;
  if (lead.client_phone) {
    eventsQuery = supabase.from("events")
      .select("*, venue:venues(id, name)")
      .eq("client_phone", lead.client_phone)
      .order("date", { ascending: false });
  } else if (lead.client_email) {
    eventsQuery = supabase.from("events")
      .select("*, venue:venues(id, name)")
      .eq("client_email", lead.client_email)
      .order("date", { ascending: false });
  }
  const eventsData = eventsQuery ? (await eventsQuery).data ?? [] : [];

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-4xl mx-auto w-full">
      <LeadDetailTabs
        lead={lead}
        inquiries={inquiries ?? []}
        events={eventsData}
        isAdmin={profile.role === "admin"}
      />
    </div>
  );
}
