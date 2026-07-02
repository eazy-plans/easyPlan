import { Building2 } from "lucide-react";
import type { VenueRow, UserRow } from "@/types/database";
import { AddVenueModal } from "@/components/venues/AddVenueModal";
import { VenuesTable } from "@/components/venues/VenuesTable";
import { PendingVenuesPanel } from "@/components/venues/PendingVenuesPanel";
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

  return (
    <>
      {isAdmin && <PendingVenuesPanel />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{venues?.length ?? 0} אולמות במערכת</p>
        {isAdmin && <AddVenueModal owners={owners ?? []} />}
      </div>

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
        <div className="flex-1 overflow-y-auto min-h-0">
          <VenuesTable
            venues={venues}
            owners={owners ?? []}
            isAdmin={isAdmin}
            isVenueOwner={profile.role === "venue_owner"}
          />
        </div>
      )}
    </>
  );
}
