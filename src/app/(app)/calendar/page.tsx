import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { CalendarContent } from "./CalendarContent";

function CalendarSkeleton() {
  return (
    <div className="flex-1 border rounded-lg bg-muted/30 animate-pulse min-h-[400px]" />
  );
}

export default async function CalendarPage() {
  const { profile } = await getUserProfile();
  if (profile.role === "secretary") redirect("/events");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <h1 className="text-2xl font-bold shrink-0">יומן אירועים</h1>
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent />
      </Suspense>
    </div>
  );
}
