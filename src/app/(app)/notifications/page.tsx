import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { NotificationsContent } from "./NotificationsContent";

export const metadata = { title: "התראות" };

export default function NotificationsPage() {
  return (
    <PageShell title="התראות">
      <Suspense fallback={<TableSkeleton />}>
        <NotificationsContent />
      </Suspense>
    </PageShell>
  );
}
