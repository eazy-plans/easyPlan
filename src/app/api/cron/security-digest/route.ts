import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSecurityAlert } from "@/lib/email/securityAlert";
import { formatDateTime } from "@/lib/utils";
import type { SecurityAlertRow } from "@/lib/email/templates/securityAlert";

// Business hours (Israel-local) outside of which audit_log activity is
// flagged as off-hours access. Tune here if the real staff schedule differs.
const BUSINESS_HOUR_START = 6;
const BUSINESS_HOUR_END = 23;

// audit_log only records mutations (+ login events, added alongside this
// digest) - there is no read/export logging anywhere in the app. This count
// is therefore a write-volume proxy for "unusual scope of fetching", not a
// true measure of data pulled. Flagged as an open item in the security review.
const VOLUME_ANOMALY_THRESHOLD = 100;

function israelHour(iso: string): number {
  // Some ICU builds render midnight as "24" rather than "00" with
  // hour12:false - normalize with modulo so that case still reads as 0.
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hour12: false }).format(new Date(iso)));
  return hour % 24;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not configured - refusing to run cron job");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: entries, error } = await supabase.from("audit_log")
    .select("action, created_at, actor:users(full_name, email)")
    .gte("created_at", since);

  if (error) {
    console.error("Cron security-digest error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: SecurityAlertRow[] = [];

  const offHours = (entries ?? []).filter((e) => {
    const hour = israelHour(e.created_at);
    return hour < BUSINESS_HOUR_START || hour >= BUSINESS_HOUR_END;
  });
  for (const e of offHours) {
    rows.push({
      title: "גישה מחוץ לשעות הפעילות",
      account: e.actor ? `${e.actor.full_name} (${e.actor.email})` : "לא ידוע",
      detail: e.action,
      occurredAt: formatDateTime(e.created_at),
    });
  }

  const volumeByActor = new Map<string, { count: number; label: string }>();
  for (const e of entries ?? []) {
    if (!e.actor) continue;
    const key = e.actor.email;
    const prev = volumeByActor.get(key);
    volumeByActor.set(key, { count: (prev?.count ?? 0) + 1, label: `${e.actor.full_name} (${e.actor.email})` });
  }
  for (const [, v] of volumeByActor) {
    if (v.count > VOLUME_ANOMALY_THRESHOLD) {
      rows.push({
        title: "היקף פעולות חריג",
        account: v.label,
        detail: `${v.count} פעולות ב-24 השעות האחרונות`,
        occurredAt: formatDateTime(new Date()),
      });
    }
  }

  if (rows.length > 0) {
    await sendSecurityAlert({
      heading: "סיכום חריגות אבטחה יומי",
      intro: "להלן החריגות שזוהו ביומן הביקורת ב-24 השעות האחרונות.",
      rows,
    });
  }

  return NextResponse.json({ offHours: offHours.length, volumeAnomalies: rows.length - offHours.length });
}
