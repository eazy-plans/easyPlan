import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getUserProfile } from "@/lib/supabase/queries";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { ROLE_HOME } from "@/lib/role-home";

export default async function AppNotFound() {
  const { profile } = await getUserProfile();

  return (
    <PageShell title="לא נמצא">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center py-16">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileQuestion size={28} strokeWidth={1.5} />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">הדף שחיפשת לא נמצא</h2>
          <p className="text-sm text-muted-foreground">
            הרשומה או הכתובת המבוקשת לא קיימות, או שהוסרו.
          </p>
        </div>
        <Button asChild className="mt-2">
          <Link href={ROLE_HOME[profile.role]}>חזרה לדף הבית</Link>
        </Button>
      </div>
    </PageShell>
  );
}
