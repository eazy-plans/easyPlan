import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { VenuesContent } from "./VenuesContent";

export default function VenuesPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6">
      <h1 className="text-2xl font-bold">אולמות</h1>
      <Suspense fallback={<TableSkeleton />}>
        <VenuesContent />
      </Suspense>
    </div>
  );
}
