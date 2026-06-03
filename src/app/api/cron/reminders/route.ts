/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/email/resend";
import { reminderHtml } from "@/lib/email/templates/reminder";
import { EVENT_TYPE_LABELS } from "@/types/booking";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];


  const { data: events, error } = await (supabase.from("events") as any)
    .select("*, venue:venues(name, address, city, parking_info, public_transport_info, hours_morning_start, hours_morning_end, hours_evening_start, hours_evening_end, hours_full_start, hours_full_end, hours_shabbat_start, hours_shabbat_end)")
    .eq("date", tomorrowStr)
    .eq("status", "approved");

  if (error) {
    console.error("Cron reminders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const HOURS_MAP: Record<string, [string, string]> = {
    morning: ["hours_morning_start", "hours_morning_end"],
    evening: ["hours_evening_start", "hours_evening_end"],
    full_day: ["hours_full_start", "hours_full_end"],
    shabbat: ["hours_shabbat_start", "hours_shabbat_end"],
  };

  let sent = 0;
  let failed = 0;

  for (const ev of events ?? []) {
    if (!ev.client_email) continue;

    const venue = ev.venue;
    const [startKey, endKey] = HOURS_MAP[ev.event_type] ?? [];
    const hoursStart = startKey ? String(venue[startKey] ?? "").slice(0, 5) : undefined;
    const hoursEnd = endKey ? String(venue[endKey] ?? "").slice(0, 5) : undefined;

    const dateFormatted = new Date(ev.date).toLocaleDateString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

    const html = reminderHtml({
      clientName: ev.client_name,
      venueName: venue?.name ?? "",
      venueAddress: venue?.address ?? "",
      venueCity: venue?.city ?? "",
      date: dateFormatted,
      eventType: EVENT_TYPE_LABELS[ev.event_type as keyof typeof EVENT_TYPE_LABELS] ?? ev.event_type,
      hoursStart,
      hoursEnd,
      parkingInfo: venue?.parking_info,
      publicTransportInfo: venue?.public_transport_info,
    });

    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@eazyplans.co.il",
      to: ev.client_email,
      subject: `תזכורת לאירוע מחר — ${venue?.name ?? ""}`,
      html,
    });

  
    await (supabase.from("email_logs") as any).insert({
      event_id: ev.id,
      recipient_email: ev.client_email,
      email_type: "reminder",
      status: emailError ? "failed" : "sent",
    });

    if (emailError) { failed++; } else { sent++; }
  }

  return NextResponse.json({ sent, failed, date: tomorrowStr });
}
