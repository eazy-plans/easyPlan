import { TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0">
      <h1 className="text-2xl font-bold mb-6">ניהול משתמשים</h1>
      <TableSkeleton />
    </div>
  );
}
