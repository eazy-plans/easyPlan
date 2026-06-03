import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { TableSkeleton } from "@/components/ui/skeleton";
import { VenueDetailContent } from "./VenueDetailContent";

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await getUserProfile();
  if (profile.role !== "admin") redirect("/venues");

  return (
    <Suspense fallback={<TableSkeleton rows={10} />}>
      <VenueDetailContent id={id} />
    </Suspense>
  );
}
