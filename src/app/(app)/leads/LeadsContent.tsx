/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { LeadsManager } from "@/components/leads/LeadsManager";

export async function LeadsContent({ initialSearch }: { initialSearch?: string }) {
  const { supabase } = await getUserProfile();

  // Newest 500 leads - the list filters client-side, and unbounded fetches
  // degrade as history accumulates. Older leads are still reachable through
  // the lead card dialog (looked up by phone) and the events page.
  const { data: leads, error } = await (supabase.from("leads") as any)
    .select("id, client_name, client_phone, client_email, status, created_at, updated_at, notes")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Failed to load leads: ${error.message}`);

  return <LeadsManager leads={leads ?? []} initialSearch={initialSearch} />;
}
