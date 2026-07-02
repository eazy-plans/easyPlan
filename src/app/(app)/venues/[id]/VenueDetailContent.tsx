/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { VenueDetailTabs } from "@/components/venues/VenueDetailTabs";
import { eventsHistoryCutoffStr } from "@/lib/utils";
import type { VenueRow, UserRow, VenueImageRow, EventRow } from "@/types/database";

export async function VenueDetailContent({ id }: { id: string }) {
  const { supabase, user, profile } = await getUserProfile();
  const isAdmin = profile.role === "admin";

  // Events are bounded to the rolling history window (see eventsHistoryCutoffStr);
  // the stats panel's all-time KPI comes from the separate head-count query so
  // it stays correct without fetching old rows.
  const [venueRes, ownersRes, imagesRes, eventsRes, allTimeRes] = await Promise.all([
    supabase.from("venues").select("*").eq("id", id).single() as unknown as Promise<{ data: VenueRow | null; error: { message: string; code?: string } | null }>,
    isAdmin
      ? supabase.from("users").select("id, full_name, email").eq("role", "venue_owner").order("full_name") as unknown as Promise<{ data: Pick<UserRow, "id" | "full_name" | "email">[] | null; error: { message: string } | null }>
      : Promise.resolve({ data: [] as Pick<UserRow, "id" | "full_name" | "email">[], error: null }),
    supabase.from("venue_images").select("*").eq("venue_id", id).order("created_at") as unknown as Promise<{ data: VenueImageRow[] | null; error: { message: string } | null }>,
    (supabase.from("events") as any)
      .select("*, creator:users!created_by(full_name), cancelled_by_user:users!cancelled_by(full_name)")
      .eq("venue_id", id)
      .gte("date", eventsHistoryCutoffStr())
      .order("date") as Promise<{ data: (EventRow & { creator?: { full_name: string } | null; cancelled_by_user?: { full_name: string } | null })[] | null; error: { message: string } | null }>,
    (supabase.from("events") as any)
      .select("id", { count: "exact", head: true })
      .eq("venue_id", id)
      .neq("status", "cancelled") as Promise<{ count: number | null; error: { message: string } | null }>,
  ]);

  // PGRST116 = zero rows from .single() - that's a genuine 404, anything else
  // (RLS, network) is an error and must not masquerade as "venue not found".
  if (venueRes.error && venueRes.error.code !== "PGRST116") {
    throw new Error(`Failed to load venue: ${venueRes.error.message}`);
  }
  if (!venueRes.data) notFound();
  if (ownersRes.error) throw new Error(`Failed to load owners: ${ownersRes.error.message}`);
  if (imagesRes.error) throw new Error(`Failed to load images: ${imagesRes.error.message}`);
  if (eventsRes.error) throw new Error(`Failed to load events: ${eventsRes.error.message}`);
  if (allTimeRes.error) throw new Error(`Failed to count events: ${allTimeRes.error.message}`);

  return (
    <VenueDetailTabs
      venue={venueRes.data}
      owners={ownersRes.data ?? []}
      images={imagesRes.data ?? []}
      events={eventsRes.data ?? []}
      allTimeCount={allTimeRes.count ?? 0}
      userId={user.id}
      isAdmin={isAdmin}
    />
  );
}
