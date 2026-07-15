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

  let eventsData: any[] = [];
  if (lead.client_email) {
    const { data } = await supabase.from("events")
      .select("*, venue:venues(id, name)")
      .eq("client_email", lead.client_email)
      .neq("status", "cancelled")
      .order("date", { ascending: false });
    eventsData = data ?? [];
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LeadDetailTabs
          lead={lead}
          inquiries={inquiries ?? []}
          events={eventsData}
        />
      </div>
    </div>
  );
}
