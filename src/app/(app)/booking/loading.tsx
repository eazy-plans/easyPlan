export default function Loading() {
  return (
    <div className="p-4 md:p-6 flex-1 flex flex-col min-h-0">
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1 gap-6">
        <div className="h-8 w-56 bg-muted rounded animate-pulse" />
        <div className="flex-1 min-h-[400px] border rounded-lg bg-muted/30 animate-pulse" />
      </div>
    </div>
  );
}
