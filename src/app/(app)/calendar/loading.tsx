export default function Loading() {
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <h1 className="text-2xl font-bold shrink-0">יומן אירועים</h1>
      <div className="flex-1 min-h-[520px] bg-muted/30 rounded-lg animate-pulse" />
    </div>
  );
}
