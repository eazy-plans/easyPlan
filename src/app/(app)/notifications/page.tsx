import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { NotificationsContent } from "./NotificationsContent";

export const metadata = { title: "התראות" };

export default function NotificationsPage() {
  return (
    <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0">
      <h1 className="text-2xl font-bold mb-6">התראות</h1>
      <Suspense fallback={<TableSkeleton />}>
        <NotificationsContent />
      </Suspense>
    </div>
  );
}
