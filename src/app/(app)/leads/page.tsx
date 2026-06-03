import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { TableSkeleton } from "@/components/ui/skeleton";
import { LeadsContent } from "./LeadsContent";

export default async function LeadsPage() {
  const { profile } = await getUserProfile();
  if (!["admin", "secretary"].includes(profile.role)) redirect("/dashboard");

  return (
    <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0">
      <h1 className="text-2xl font-bold mb-6">לידים ולקוחות</h1>
      <Suspense fallback={<TableSkeleton />}>
        <LeadsContent />
      </Suspense>
    </div>
  );
}
