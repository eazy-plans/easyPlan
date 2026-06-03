import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">סקירה כללית</h1>
          <div className="h-4 w-28 bg-muted/60 rounded animate-pulse mt-0.5" />
        </div>
        <div className="h-9 w-24 bg-muted rounded animate-pulse" />
      </div>
      <DashboardSkeleton />
    </div>
  );
}
