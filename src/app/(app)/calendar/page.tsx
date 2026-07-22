import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarContent } from "./CalendarContent";

function CalendarSkeleton() {
  return <Skeleton className="flex-1 border rounded-lg bg-muted/30 min-h-[400px]" />;
}

export default async function CalendarPage() {
  const { profile } = await getUserProfile();
  if (profile.role === "secretary") redirect("/events");

  return (
    <PageShell title="יומן אירועים" scroll={false} bodyClassName="gap-4">
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent />
      </Suspense>
    </PageShell>
  );
}
