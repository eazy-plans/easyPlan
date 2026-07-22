import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { SettingsContent } from "./SettingsContent";

export default async function SettingsPage() {
  const { profile } = await getUserProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  return (
    <PageShell title="ניהול משתמשים">
      <Suspense fallback={<TableSkeleton />}>
        <SettingsContent />
      </Suspense>
    </PageShell>
  );
}
