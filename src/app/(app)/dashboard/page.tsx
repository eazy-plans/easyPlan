import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { YearPicker } from "@/components/dashboard/YearPicker";
import { PageShell } from "@/components/ui/page-shell";
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
    <PageShell title="סקירה כללית" description={`נתוני שנת ${year}`} actions={<YearPicker year={year} />}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent year={year} userId={user.id} isOwner={profile.role === "venue_owner"} />
      </Suspense>
    </PageShell>
  );
}
