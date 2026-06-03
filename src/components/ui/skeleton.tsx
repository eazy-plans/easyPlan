export function TableSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 flex-1">
      <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-14 w-full bg-muted/60 rounded-lg animate-pulse" />
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
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            <div className="h-7 w-14 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-72 border rounded-lg bg-muted/30 animate-pulse" />
    </div>
  );
}
