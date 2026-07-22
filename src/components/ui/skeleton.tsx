import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function TableSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 flex-1">
      <Skeleton className="h-10 w-full rounded-lg" />
      {[...Array(rows)].map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg bg-muted/60" />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg bg-muted/30" />
    </div>
  );
}
