/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { LeadsManager } from "@/components/leads/LeadsManager";

export async function LeadsContent({ initialSearch }: { initialSearch?: string }) {
  const { supabase } = await getUserProfile();

  const [{ data: leads }, { data: venues }] = await Promise.all([
    (supabase.from("leads") as any)
      .select("*, interests:lead_venue_interests(venue:venues(id,name))")
      .order("created_at", { ascending: false }),
    (supabase.from("venues") as any).select("id, name").eq("is_active", true).order("name"),
  ]);

  return <LeadsManager leads={leads ?? []} venues={venues ?? []} initialSearch={initialSearch} />;
}
