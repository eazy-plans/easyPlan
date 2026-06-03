import { notFound } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { VenueForm } from "@/components/venues/VenueForm";
import { VenueGallery } from "@/components/venues/VenueGallery";
import type { VenueRow, UserRow, VenueImageRow } from "@/types/database";

export async function VenueDetailContent({ id }: { id: string }) {
  const { supabase } = await getUserProfile();

  const [{ data: venue }, { data: owners }, { data: images }] = await Promise.all([
    supabase.from("venues").select("*").eq("id", id).single() as unknown as Promise<{ data: VenueRow | null }>,
    supabase.from("users").select("id, full_name, email").eq("role", "venue_owner").order("full_name") as unknown as Promise<{ data: Pick<UserRow, "id" | "full_name" | "email">[] | null }>,
    supabase.from("venue_images").select("*").eq("venue_id", id).order("created_at") as unknown as Promise<{ data: VenueImageRow[] | null }>,
  ]);

  if (!venue) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{venue.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
        </p>
      </div>
      <VenueForm venue={venue} owners={owners ?? []} initialImages={images ?? []} />
      <VenueGallery venueId={venue.id} initialImages={images ?? []} />
    </div>
  );
}
