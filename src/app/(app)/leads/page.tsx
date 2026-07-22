import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { LeadsContent } from "./LeadsContent";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile } = await getUserProfile();
  if (!["admin", "secretary"].includes(profile.role)) redirect("/dashboard");
  const { q } = await searchParams;

  return (
    <PageShell title="לידים ולקוחות" scroll={false}>
      <Suspense fallback={<TableSkeleton />}>
        <LeadsContent initialSearch={q} />
      </Suspense>
    </PageShell>
  );
}
