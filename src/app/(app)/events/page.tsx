import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { EventsContent } from "./EventsContent";

export default function EventsPage() {
  return (
    <PageShell title="ניהול אירועים" scroll={false}>
      <Suspense fallback={<TableSkeleton />}>
        <EventsContent />
      </Suspense>
    </PageShell>
  );
}
