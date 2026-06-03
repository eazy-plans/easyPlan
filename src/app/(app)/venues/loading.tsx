import { TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-6">
      <h1 className="text-2xl font-bold">אולמות</h1>
      <TableSkeleton />
    </div>
  );
}
