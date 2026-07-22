import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { TableSkeleton } from "@/components/ui/skeleton";
import { VenueDetailContent } from "./VenueDetailContent";

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await getUserProfile();

  if (profile.role === "secretary") redirect("/venues");

  // Venue owners can only access their own venues
  if (profile.role === "venue_owner") {
    const { data: venue } = await supabase
      .from("venues")
      .select("owner_user_id")
      .eq("id", id)
      .single() as unknown as { data: { owner_user_id: string } | null };
    if (!venue) notFound();
    if (venue.owner_user_id !== user.id) redirect("/venues");
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Suspense fallback={<div className="p-4 sm:p-6"><TableSkeleton rows={10} /></div>}>
        <VenueDetailContent id={id} />
      </Suspense>
    </div>
  );
}
