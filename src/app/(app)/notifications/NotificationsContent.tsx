import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/queries";
import { PendingVenuesPanel } from "@/components/venues/PendingVenuesPanel";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";

export async function NotificationsContent() {
  const { supabase, profile } = await getUserProfile();
  if (profile.role !== "admin") redirect("/");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [pendingCancelRes, recentCancelledRes] = await Promise.all([
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

  const pendingCancellations = pendingCancelRes.data ?? [];
  const recentCancelled = recentCancelledRes.data ?? [];

  return (
    <div className="space-y-10 max-w-3xl">
      {/* New venues awaiting approval - the panel includes approve/reject */}
      <PendingVenuesPanel />

      {/* Events awaiting cancellation */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          בקשות ביטול בהמתנה ({pendingCancellations.length})
        </h2>
        {migrationMissing ? (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
            כדי להפעיל את מעקב בקשות הביטול יש להריץ את מיגרציה 029
            (supabase/migrations/029_event_cancellation_request.sql) בעורך ה-SQL של Supabase.
          </p>
        ) : pendingCancellations.length === 0 ? (
          <p className="text-muted-foreground">אין אירועים הממתינים לביטול</p>
        ) : (
          <>
            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
              אירועים שהלקוח ביקש לבטל. אין לבטל אותם בפועל אלא אם נמצא לקוח אחר לתאריך.
            </p>
            <div className="space-y-2 border rounded-lg divide-y">
              {pendingCancellations.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="flex items-start justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {ev.client_name} · {ev.venue?.name ?? "-"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {formatDate(new Date(ev.date))} · {toHebrewDateShort(ev.date)}
                    </p>
                    {ev.cancellation_requested_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        התקבלה בקשה: <span dir="ltr">{formatDateTime(ev.cancellation_requested_at)}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 shrink-0">
                    ממתין לביטול
                  </Badge>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recent cancellations - informational */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          ביטולים מהשבוע האחרון ({recentCancelled.length})
        </h2>
        {recentCancelled.length === 0 ? (
          <p className="text-muted-foreground">לא בוטלו אירועים בשבוע האחרון</p>
        ) : (
          <div className="space-y-2 border rounded-lg divide-y">
            {recentCancelled.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="flex items-start justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {ev.client_name} · {ev.venue?.name ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDate(new Date(ev.date))} · {toHebrewDateShort(ev.date)}
                  </p>
                  {ev.cancellation_reason && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      סיבה: {ev.cancellation_reason}
                    </p>
                  )}
                </div>
                <div className="text-left shrink-0">
                  <Badge variant="secondary">בוטל</Badge>
                  {ev.cancelled_at && (
                    <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                      {formatDateTime(ev.cancelled_at)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
