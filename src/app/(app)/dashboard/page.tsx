import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { YearPicker } from "@/components/dashboard/YearPicker";
import { DashboardContent } from "./DashboardContent";
import { DashboardSkeleton } from "@/components/ui/skeleton";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { user, profile } = await getUserProfile();
  if (profile.role === "secretary") redirect("/events");

  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const parsedYear = parseInt(yearParam ?? "", 10);
  const year = Math.min(
    currentYear,
    Math.max(2000, Number.isNaN(parsedYear) ? currentYear : parsedYear)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">סקירה כללית</h1>
          <p className="text-sm text-muted-foreground mt-0.5">נתוני שנת {year}</p>
        </div>
        <YearPicker year={year} />
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent year={year} userId={user.id} isOwner={profile.role === "venue_owner"} />
      </Suspense>
    </div>
  );
}
