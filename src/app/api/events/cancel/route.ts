/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistNotifyEmail } from "@/lib/email/sendEventEmails";

// POST /api/events/cancel
// body: { eventId: string }
export async function POST(request: Request) {
  const { eventId } = await request.json();
  if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

  // Cookie-scoped client: getUser + the event read/update stay under RLS, so the
  // existing "who may cancel which event" row policies keep applying.
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


  const { data: event, error: fetchErr } = await (supabase.from("events") as any)
    .select("id, venue_id, date, status")
    .eq("id", eventId)
    .single();

  if (fetchErr || !event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.status === "cancelled") return NextResponse.json({ ok: true });

  // Cancel the event

  const { error: updateErr } = await (supabase.from("events") as any)
    .update({ status: "cancelled" })
    .eq("id", eventId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // waitlist and email_logs are admin-only under RLS, but a secretary may also
  // cancel events; use the service-role client for this trusted follow-up work.
  const admin = createAdminClient();

  const { data: waitlistEntries } = await (admin.from("waitlist") as any)
    .select("id, lead_id, leads(client_name, client_email), venues(name)")
    .eq("venue_id", event.venue_id)
    .eq("requested_date", event.date);

  for (const entry of waitlistEntries ?? []) {
    const lead = entry.leads;
    const venue = entry.venues;
    if (!lead?.client_email) continue;

    try {
      await sendWaitlistNotifyEmail(
        lead.client_email,
        lead.client_name,
        venue?.name ?? "",
        event.date,
      );

      await (admin.from("email_logs") as any).insert({
        event_id: eventId,
        recipient_email: lead.client_email,
        email_type: "waitlist_notify",
        status: "sent",
      });
    } catch {

      await (admin.from("email_logs") as any).insert({
        event_id: eventId,
        recipient_email: lead.client_email,
        email_type: "waitlist_notify",
        status: "failed",
      });
    }
  }

  return NextResponse.json({ ok: true, notified: (waitlistEntries ?? []).length });
}
