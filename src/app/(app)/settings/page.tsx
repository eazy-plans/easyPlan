import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { TableSkeleton } from "@/components/ui/skeleton";
import { SettingsContent } from "./SettingsContent";

export default async function SettingsPage() {
  const { profile } = await getUserProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  return (
    <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0">
      <h1 className="text-2xl font-bold mb-6">ניהול משתמשים</h1>
      <Suspense fallback={<TableSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
