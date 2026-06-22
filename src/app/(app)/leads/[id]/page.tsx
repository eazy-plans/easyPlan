import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { LeadTimeline } from "@/components/leads/LeadTimeline";

export const metadata = { title: "פרטי ליד" };

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const { supabase, user } = await getUserProfile();

  if (!user || !["admin", "secretary"].includes(user.user_metadata.role)) {
    redirect("/");
  }

  const { data: lead, error } = await (supabase.from("leads") as any)
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !lead) {
    notFound();
  }

  const { data: inquiries } = await (supabase.from("lead_inquiries") as any)
    .select("*, venue:venues(id, name)")
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false });

  const { data: events } = await (supabase.from("events") as any)
    .select("*, venue:venues(id, name)")
    .eq("client_email", lead.client_email)
    .neq("status", "cancelled")
    .order("date", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LeadTimeline
          lead={lead}
          inquiries={inquiries ?? []}
          events={events ?? []}
        />
      </div>
    </div>
  );
}
