import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { BookingWizard } from "@/components/booking/BookingWizard";
import type { VenueRow, VenueImageRow } from "@/types/database";

export default async function BookingPage() {
  const { supabase, user, profile } = await getUserProfile();
  if (profile.role === "venue_owner") redirect("/calendar");
  const isAdmin = profile.role === "admin";

  // The venue list is the first thing the wizard shows - fetching it here
  // instead of client-side in StepSearch removes a post-hydration round trip
  // (page painted, then a "loading venues" spinner). RLS scopes visibility
  // the same way it did for the client fetch.
  const { data: venues, error } = await supabase.from("venues")
    .select("*, images:venue_images(*)")
    .eq("is_active", true)
    .order("name") as { data: (VenueRow & { images: VenueImageRow[] })[] | null; error: { message: string } | null };
  if (error) throw new Error(`Failed to load venues: ${error.message}`);

  return (
    <div className="p-4 md:p-6 flex-1 flex flex-col min-h-0">
      <BookingWizard isAdmin={isAdmin} userId={user.id} venues={venues ?? []} />
    </div>
  );
}
