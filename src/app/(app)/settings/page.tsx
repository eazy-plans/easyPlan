import { Suspense } from "react";
import { getUserProfile } from "@/lib/supabase/queries";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SettingsContent } from "./SettingsContent";
import { AuditLogContent } from "./AuditLogContent";
import { MyAccountSettings } from "@/components/settings/MyAccountSettings";

export default async function SettingsPage() {
  const { user, profile } = await getUserProfile();

  if (profile.role !== "admin") {
    return (
      <PageShell title="הגדרות">
        <MyAccountSettings userId={user.id} email={user.email ?? ""} fullName={profile.full_name} />
      </PageShell>
    );
  }

  return (
    <PageShell title="הגדרות">
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">ניהול משתמשים</TabsTrigger>
          <TabsTrigger value="audit">יומן ביקורת</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="pt-4">
          <Suspense fallback={<TableSkeleton />}>
            <SettingsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <Suspense fallback={<TableSkeleton />}>
            <AuditLogContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
