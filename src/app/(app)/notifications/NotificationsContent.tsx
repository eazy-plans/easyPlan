import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { PendingVenuesPanel } from "@/components/venues/PendingVenuesPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatChip } from "@/components/ui/stat-chip";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { Building2, XCircle, History, ChevronLeft, Inbox, Zap } from "lucide-react";
import { INQUIRY_STATUS_LABELS, INQUIRY_STATUS_VARIANT } from "@/types/leads";

export async function NotificationsContent() {
  const { supabase, profile } = await getUserProfile();
  if (profile.role !== "admin" && profile.role !== "secretary") redirect("/");
  const isAdmin = profile.role === "admin";

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingCancelRes, recentCancelledRes, pendingVenuesCountRes, quickInquiriesRes] = await Promise.all([
    supabase.from("events")
      .select("id, date, client_name, cancellation_requested_at, venue:venues(id, name)")
      .not("cancellation_requested_at", "is", null)
      .neq("status", "cancelled")
      .order("cancellation_requested_at", { ascending: false }),
    supabase.from("events")
      .select("id, date, client_name, cancelled_at, cancellation_reason, venue:venues(id, name)")
      .eq("status", "cancelled")
      .gte("cancelled_at", sevenDaysAgo)
      .order("cancelled_at", { ascending: false }),
    // Venue approvals are admin-only - RLS hides pending venues from
    // secretaries entirely, so skip the query rather than run it for nothing.
    isAdmin
      ? supabase.from("venues")
          .select("id", { count: "exact", head: true })
          .eq("approval_status", "pending")
      : Promise.resolve({ count: 0, error: null }),
    // G1: quick inquiries (LeadsManager's "+ פנייה מהירה" dialog) logged
    // over the last 7 days, source: "quick" (032) distinguishes them from
    // inquiries added via the regular lead-detail flow.
    supabase.from("lead_inquiries")
      .select("id, status, created_at, lead:leads(id, client_name), venue:venues(id, name)")
      .eq("source", "quick")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false }),
  ]);

  // 42703 = undefined column: migration 029 (cancellation_requested_at) has
  // not been applied yet. Degrade to a banner so venue approvals stay usable.
  const migrationMissing = pendingCancelRes.error?.code === "42703";
  if (pendingCancelRes.error && !migrationMissing) {
    throw new Error(`Failed to load cancellation requests: ${pendingCancelRes.error.message}`);
  }
  if (recentCancelledRes.error) {
    throw new Error(`Failed to load recent cancellations: ${recentCancelledRes.error.message}`);
  }
  // Same degrade-to-banner treatment for migration 032 (lead_inquiries.source).
  const quickInquiriesMigrationMissing = quickInquiriesRes.error?.code === "42703";
  if (quickInquiriesRes.error && !quickInquiriesMigrationMissing) {
    throw new Error(`Failed to load quick inquiries: ${quickInquiriesRes.error.message}`);
  }

  const pendingCancellations = pendingCancelRes.data ?? [];
  const recentCancelled = recentCancelledRes.data ?? [];
  const pendingVenuesCount = pendingVenuesCountRes.count ?? 0;
  const quickInquiries = quickInquiriesRes.data ?? [];

  return (
    <div className="space-y-5">
      {/* Stat strip */}
      <div className={`grid grid-cols-2 gap-3 max-w-3xl ${isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        {isAdmin && (
          <StatChip label="אולמות ממתינים" value={pendingVenuesCount} icon={Building2} tone="primary" />
        )}
        <StatChip label="בקשות ביטול" value={migrationMissing ? "—" : pendingCancellations.length} icon={XCircle} tone="warning" />
        <StatChip label="ביטולים השבוע" value={recentCancelled.length} icon={History} tone="muted" />
        <StatChip label="פניות מהירות השבוע" value={quickInquiriesMigrationMissing ? "—" : quickInquiries.length} icon={Zap} tone="violet" />
      </div>

      <Tabs defaultValue={isAdmin ? "venues" : "cancellations"}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="venues">אולמות ממתינים לאישור ({pendingVenuesCount})</TabsTrigger>
          )}
          <TabsTrigger value="cancellations">בקשות ביטול ({migrationMissing ? "—" : pendingCancellations.length})</TabsTrigger>
          <TabsTrigger value="recent">ביטולים מהשבוע האחרון ({recentCancelled.length})</TabsTrigger>
          <TabsTrigger value="quick">פניות מהירות ({quickInquiriesMigrationMissing ? "—" : quickInquiries.length})</TabsTrigger>
        </TabsList>

        {/* New venues awaiting approval - the panel includes approve/reject, admin only */}
        {isAdmin && (
          <TabsContent value="venues" className="pt-4">
            <PendingVenuesPanel />
          </TabsContent>
        )}

        {/* Events awaiting cancellation */}
        <TabsContent value="cancellations" className="pt-4">
          <Card variant="elevated">
            <CardContent className="px-4 pt-4 pb-4">
              {migrationMissing ? (
                <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
                  כדי להפעיל את מעקב בקשות הביטול יש להריץ את מיגרציה 029
                  (supabase/migrations/029_event_cancellation_request.sql) בעורך ה-SQL של Supabase.
                </p>
              ) : pendingCancellations.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
                  <Inbox size={28} strokeWidth={1.5} className="text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">אין אירועים הממתינים לביטול</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2 mb-3">
                    אירועים שהלקוח ביקש לבטל. אין לבטל אותם בפועל אלא אם נמצא לקוח אחר לתאריך.
                  </p>
                  <div className="divide-y divide-border/60">
                    {pendingCancellations.map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/events/${ev.id}`}
                        className="group flex items-center justify-between gap-4 px-2 py-2.5 rounded-lg hover:bg-warning/10 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm">
                            {ev.client_name} · {ev.venue?.name ?? "-"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(new Date(ev.date))} · {toHebrewDateShort(ev.date)}
                            {ev.cancellation_requested_at && (
                              <> · התקבלה <span dir="ltr">{formatDateTime(ev.cancellation_requested_at)}</span></>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="warning-soft">ממתין לביטול</Badge>
                          <ChevronLeft size={15} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent cancellations - informational */}
        <TabsContent value="recent" className="pt-4">
          <Card variant="elevated">
            <CardContent className="px-4 pt-4 pb-4">
              {recentCancelled.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
                  <Inbox size={28} strokeWidth={1.5} className="text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">לא בוטלו אירועים בשבוע האחרון</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentCancelled.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/events/${ev.id}`}
                      className="group flex items-center justify-between gap-4 px-2 py-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {ev.client_name} · {ev.venue?.name ?? "-"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(new Date(ev.date))} · {toHebrewDateShort(ev.date)}
                          {ev.cancellation_reason && <> · סיבה: {ev.cancellation_reason}</>}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <div>
                          <Badge variant="secondary">בוטל</Badge>
                          {ev.cancelled_at && (
                            <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                              {formatDateTime(ev.cancelled_at)}
                            </p>
                          )}
                        </div>
                        <ChevronLeft size={15} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick inquiries logged this week (G1) */}
        <TabsContent value="quick" className="pt-4">
          <Card variant="elevated">
            <CardContent className="px-4 pt-4 pb-4">
              {quickInquiriesMigrationMissing ? (
                <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
                  כדי להפעיל את מעקב הפניות המהירות יש להריץ את מיגרציה 032
                  (supabase/migrations/032_lead_inquiries_chronological.sql) בעורך ה-SQL של Supabase.
                </p>
              ) : quickInquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center">
                  <Inbox size={28} strokeWidth={1.5} className="text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">לא נרשמו פניות מהירות בשבוע האחרון</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {quickInquiries.map((inquiry) => (
                    <Link
                      key={inquiry.id}
                      href={inquiry.lead?.id ? `/leads/${inquiry.lead.id}` : "/leads"}
                      className="group flex items-center justify-between gap-4 px-2 py-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {inquiry.lead?.client_name ?? "-"} · {inquiry.venue?.name ?? "-"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                          {formatDateTime(inquiry.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={INQUIRY_STATUS_VARIANT[inquiry.status]}>
                          {INQUIRY_STATUS_LABELS[inquiry.status]}
                        </Badge>
                        <ChevronLeft size={15} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
