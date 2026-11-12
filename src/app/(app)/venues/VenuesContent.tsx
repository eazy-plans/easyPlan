import { Building2 } from "lucide-react";
import type { VenueRow, VenueImageRow, UserRow } from "@/types/database";
import { AddVenueModal } from "@/components/venues/AddVenueModal";
import { VenuesViewToggle } from "@/components/venues/VenuesViewToggle";
import { getUserProfile } from "@/lib/supabase/queries";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

// Secretaries only ever see approved venues belonging to other owners (read-only),
// so rejection_reason, approved_by/at and contact_phone are left off - they're
// never displayed and secretaries have no business reason to see them.
const SECRETARY_VENUE_COLUMNS =
  "id, name, address, city, neighborhood, max_capacity, price_morning, price_evening, " +
  "price_full_day, price_shabbat, description_short, description_long, parking_info, " +
  "public_transport_info, hours_morning_start, hours_morning_end, hours_evening_start, " +
  "hours_evening_end, hours_full_start, hours_full_end, hours_shabbat_start, hours_shabbat_end, " +
  "has_elevator, has_parking, is_accessible, has_public_transport, is_active, contact_name, " +
  "cancellation_policy, approval_status, lat, lng, coords_approximate";

// Venue owners only ever see their own venues (query below filters by owner_user_id),
// so rejection_reason and contact_phone are fine to include. This list excludes only
// approved_by/approved_at/created_at, which are admin-internal audit fields the owner's
// screens never read. NOTE: VenueForm does a full-row overwrite on save, so every column
// it reads into form state must stay in this list - trimming further will silently wipe
// those fields the next time an owner saves an edit.
const VENUE_OWNER_VENUE_COLUMNS =
  "id, name, address, city, neighborhood, max_capacity, owner_user_id, contact_name, " +
  "contact_phone, description_short, description_long, parking_info, public_transport_info, " +
  "has_elevator, has_parking, is_accessible, has_public_transport, price_morning, price_evening, " +
  "price_full_day, price_shabbat, hours_morning_start, hours_morning_end, hours_evening_start, " +
  "hours_evening_end, hours_full_start, hours_full_end, hours_shabbat_start, hours_shabbat_end, " +
  "is_active, cancellation_policy, approval_status, rejection_reason, lat, lng, coords_approximate";

// venue_images has no sensitive columns, but venue_id/created_at aren't used by the
// preview gallery - keep the non-admin select as narrow as the venues one above.
const RESTRICTED_VENUE_IMAGE_COLUMNS = "id, storage_path, is_primary";

export async function VenuesContent() {
  const { supabase, user, profile } = await getUserProfile();
  const isAdmin = profile.role === "admin";
  const isSecretary = profile.role === "secretary";

  // Secretaries can't reach the admin-only /venues/[id] management page, so
  // they need images up front for the read-only preview modal (see VenuesTable).
  //
  // Column list is scoped per role - admins get the full row, secretary/venue_owner
  // get only the columns their screens actually read (see constants above). This is
  // a UI-layer reduction, not enforcement: RLS on `venues` is row-level only, so a
  // direct query from the browser can still request any column RLS lets the row
  // through for. Real enforcement would need a column-scoped view or RPC.
  const venueColumns = isAdmin
    ? "*"
    : profile.role === "venue_owner"
      ? VENUE_OWNER_VENUE_COLUMNS
      : SECRETARY_VENUE_COLUMNS;
  const imageColumns = isAdmin ? "*" : RESTRICTED_VENUE_IMAGE_COLUMNS;

  let venueQuery = supabase
    .from("venues")
    .select(`${venueColumns}, images:venue_images(${imageColumns})`)
    .order("name", { ascending: true });

  if (profile.role === "venue_owner") {
    venueQuery = venueQuery.eq("owner_user_id", user.id) as typeof venueQuery;
  } else if (profile.role === "secretary") {
    // Secretaries can only see approved venues
    venueQuery = venueQuery.eq("approval_status", "approved") as typeof venueQuery;
  }

  const { data: venues, error: venuesError } = (await venueQuery) as { data: VenueWithImages[] | null; error: { message: string } | null };
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
          isSecretary={isSecretary}
          actions={isAdmin ? <AddVenueModal key="add-venue" owners={owners ?? []} /> : undefined}
        />
      )}
    </>
  );
}
