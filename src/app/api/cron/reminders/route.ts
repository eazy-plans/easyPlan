import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { formatDateHe } from "@/lib/email/sendEventEmails";
import { reminderHtml } from "@/lib/email/templates/reminder";
import { EVENT_TYPE_LABELS } from "@/types/booking";
import { toLocalDateStr } from "@/lib/utils";

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

  // Cron requests carry no user session, so RLS would hide every row. Use the
  // service-role client - the CRON_SECRET check above is the access gate.
  const supabase = createAdminClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Israel-local date, not UTC: the old toISOString() version only worked
  // because the cron fires at 06:00 UTC when both dates happen to agree.
  const tomorrowStr = toLocalDateStr(tomorrow);


  const { data: events, error } = await supabase.from("events")
    .select("*, venue:venues(name, address, city, parking_info, public_transport_info, hours_morning_start, hours_morning_end, hours_evening_start, hours_evening_end, hours_full_start, hours_full_end, hours_shabbat_start, hours_shabbat_end)")
    .eq("date", tomorrowStr)
    .eq("status", "approved");

  if (error) {
    console.error("Cron reminders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const HOURS_MAP = {
    morning: ["hours_morning_start", "hours_morning_end"],
    evening: ["hours_evening_start", "hours_evening_end"],
    full_day: ["hours_full_start", "hours_full_end"],
    shabbat: ["hours_shabbat_start", "hours_shabbat_end"],
  } as const;

  let sent = 0;
  let failed = 0;

  for (const ev of events ?? []) {
    if (!ev.client_email) continue;

    const venue = ev.venue;
    const [startKey, endKey] = HOURS_MAP[ev.event_type];
    const hoursStart = String(venue?.[startKey] ?? "").slice(0, 5) || undefined;
    const hoursEnd = String(venue?.[endKey] ?? "").slice(0, 5) || undefined;

    const dateFormatted = formatDateHe(ev.date);

    const html = reminderHtml({
      clientName: ev.client_name,
      venueName: venue?.name ?? "",
      venueAddress: venue?.address ?? "",
      venueCity: venue?.city ?? "",
      date: dateFormatted,
      eventType: EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type,
      hoursStart,
      hoursEnd,
      parkingInfo: venue?.parking_info ?? undefined,
      publicTransportInfo: venue?.public_transport_info ?? undefined,
    });

    let emailFailed = false;
    try {
      await sendEmail({
        to: ev.client_email,
        subject: `תזכורת לאירוע מחר - ${venue?.name ?? ""}`,
        html,
      });
    } catch (err) {
      console.error(`Reminder email failed for event ${ev.id}:`, err);
      emailFailed = true;
    }

    await supabase.from("email_logs").insert({
      event_id: ev.id,
      recipient_email: ev.client_email,
      email_type: "reminder",
      status: emailFailed ? "failed" : "sent",
    });

    if (emailFailed) { failed++; } else { sent++; }
  }

  return NextResponse.json({ sent, failed, date: tomorrowStr });
}
