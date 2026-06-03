/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { LeadsManager } from "@/components/leads/LeadsManager";

export default async function LeadsPage() {
  const { supabase, profile } = await getUserProfile();

  if (!["admin", "secretary"].includes(profile.role)) redirect("/dashboard");


  const [{ data: leads }, { data: venues }] = await Promise.all([
    (supabase.from("leads") as any)
      .select("*, interests:lead_venue_interests(venue:venues(id,name))")
      .order("created_at", { ascending: false }),
  
    (supabase.from("venues") as any).select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0">
      <h1 className="text-2xl font-bold mb-6">לידים ולקוחות</h1>
      <LeadsManager leads={leads ?? []} venues={venues ?? []} />
    </div>
  );
}
