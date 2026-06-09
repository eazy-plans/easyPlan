/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { VenueDetailTabs } from "@/components/venues/VenueDetailTabs";
import type { VenueRow, UserRow, VenueImageRow, EventRow } from "@/types/database";

export async function VenueDetailContent({ id }: { id: string }) {
  const { supabase, user, profile } = await getUserProfile();
  const isAdmin = profile.role === "admin";

  const [{ data: venue }, { data: owners }, { data: images }, { data: events }] = await Promise.all([
    supabase.from("venues").select("*").eq("id", id).single() as unknown as Promise<{ data: VenueRow | null }>,
    isAdmin
      ? supabase.from("users").select("id, full_name, email").eq("role", "venue_owner").order("full_name") as unknown as Promise<{ data: Pick<UserRow, "id" | "full_name" | "email">[] | null }>
      : Promise.resolve({ data: [] as Pick<UserRow, "id" | "full_name" | "email">[] }),
    supabase.from("venue_images").select("*").eq("venue_id", id).order("created_at") as unknown as Promise<{ data: VenueImageRow[] | null }>,
    (supabase.from("events") as any).select("*").eq("venue_id", id).order("date") as Promise<{ data: EventRow[] | null }>,
  ]);

  if (!venue) notFound();

  return (
    <VenueDetailTabs
      venue={venue}
      owners={owners ?? []}
      images={images ?? []}
      events={events ?? []}
      userId={user.id}
      isAdmin={isAdmin}
    />
  );
}
