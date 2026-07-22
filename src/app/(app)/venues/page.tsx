import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { VenuesContent } from "./VenuesContent";

export default function VenuesPage() {
  return (
    <PageShell title="אולמות" scroll={false} bodyClassName="gap-4">
      <Suspense fallback={<TableSkeleton />}>
        <VenuesContent />
      </Suspense>
    </PageShell>
  );
}
