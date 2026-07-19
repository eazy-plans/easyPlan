import { Building2 } from "lucide-react";
import type { VenueRow, UserRow } from "@/types/database";
import { AddVenueModal } from "@/components/venues/AddVenueModal";
import { VenuesViewToggle } from "@/components/venues/VenuesViewToggle";
import { getUserProfile } from "@/lib/supabase/queries";

export async function VenuesContent() {
  const { supabase, user, profile } = await getUserProfile();
  const isAdmin = profile.role === "admin";

  let venueQuery = supabase.from("venues").select("*").order("created_at", { ascending: false });

  if (profile.role === "venue_owner") {
    venueQuery = venueQuery.eq("owner_user_id", user.id) as typeof venueQuery;
  } else if (profile.role === "secretary") {
    // Secretaries can only see approved venues
    venueQuery = venueQuery.eq("approval_status", "approved") as typeof venueQuery;
  }

  const { data: venues, error: venuesError } = (await venueQuery) as { data: VenueRow[] | null; error: { message: string } | null };
  if (venuesError) throw new Error(`Failed to load venues: ${venuesError.message}`);

  const { data: owners, error: ownersError } = isAdmin
    ? ((await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "venue_owner")
        .order("full_name")) as {
        data: Pick<UserRow, "id" | "full_name" | "email">[] | null;
        error: { message: string } | null;
      })
    : { data: [] as Pick<UserRow, "id" | "full_name" | "email">[], error: null };
  if (ownersError) throw new Error(`Failed to load owners: ${ownersError.message}`);

  // Pending-approval venues are handled on the notifications page.
  return (
    <>
      {!venues?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
          <Building2 size={48} strokeWidth={1} />
          <p className="text-lg font-medium">אין אולמות עדיין</p>
          {isAdmin && (
            <>
              <p className="text-sm">הוסף את האולם הראשון שלך</p>
              <div className="mt-2">
                <AddVenueModal owners={owners ?? []} />
              </div>
            </>
          )}
        </div>
      ) : (
        <VenuesViewToggle
          venues={venues}
          owners={owners ?? []}
          isAdmin={isAdmin}
          isVenueOwner={profile.role === "venue_owner"}
          actions={isAdmin ? <AddVenueModal key="add-venue" owners={owners ?? []} /> : undefined}
        />
      )}
    </>
  );
}
