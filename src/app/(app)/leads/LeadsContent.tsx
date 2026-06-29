/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { LeadsManager } from "@/components/leads/LeadsManager";

export async function LeadsContent({ initialSearch }: { initialSearch?: string }) {
  const { supabase } = await getUserProfile();

  const { data: leads } = await (supabase.from("leads") as any)
    .select("id, client_name, client_phone, client_email, status, created_at, updated_at, notes")
    .order("created_at", { ascending: false });

  return <LeadsManager leads={leads ?? []} initialSearch={initialSearch} />;
}
