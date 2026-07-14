/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistNotifyEmail, sendCancellationEmail } from "@/lib/email/sendEventEmails";

// POST /api/events/cancel
// body: { eventId: string, cancellationReason?: string }
const BodySchema = z.object({
  eventId: z.uuid(),
  cancellationReason: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { eventId, cancellationReason } = parsed.data;

  // Cookie-scoped client: getUser + the event read/update stay under RLS, so the
  // existing "who may cancel which event" row policies keep applying.
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch full event details with venue for the cancellation email
  const { data: event, error: fetchErr } = await (supabase.from("events") as any)
    // users must be disambiguated (venues also references users via approved_by),
    // and the contact phone lives on venues, not users.
    .select("id, venue_id, date, status, client_name, client_phone, client_email, price_final, booking_date, original_price_final, notes, venues(id, name, city, owner_user_id, cancellation_policy, contact_name, contact_phone, owner:users!owner_user_id(full_name))")
    .eq("id", eventId)
    .single();

  if (fetchErr || !event) {
    if (fetchErr) console.error(`Cancel: event fetch failed for ${eventId}:`, fetchErr);
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.status === "cancelled") return NextResponse.json({ ok: true, notified: 0 });

  const venue = event.venues;
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  // Store original price if not already set. Refunds are no longer computed
  // automatically - the venue's free-text cancellation policy governs them and
  // they are settled manually between the venue and the client.
  const originalPrice = event.original_price_final || event.price_final;

  const { error: updateErr } = await (supabase.from("events") as any)
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: cancellationReason || null,
      original_price_final: originalPrice,
    })
    .eq("id", eventId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Use admin client for email logs and other admin-only operations
  const admin = createAdminClient();

  // Send cancellation email to client. Skip logging when there is no client
  // email - email_logs.recipient_email is NOT NULL.
  if (event.client_email) {
    try {
      await sendCancellationEmail(event, venue, cancellationReason);

      await (admin.from("email_logs") as any).insert({
        event_id: eventId,
        recipient_email: event.client_email,
        email_type: "event_cancelled",
        status: "sent",
      });
    } catch (emailErr) {
      console.error("Failed to send cancellation email:", emailErr);

      await (admin.from("email_logs") as any).insert({
        event_id: eventId,
        recipient_email: event.client_email,
        email_type: "event_cancelled",
        status: "failed",
      });
    }
  }

  // Update the linked lead_inquiry status to cancelled (if it exists). The
  // booking flow upserts leads keyed by client_phone, so resolve this event's
  // lead the same way - matching any "booked" inquiry for the venue could
  // cancel a different client's inquiry.
  if (event.client_phone) {
    const { data: lead } = await (admin.from("leads") as any)
      .select("id")
      .eq("client_phone", event.client_phone)
      .maybeSingle();

    if (lead) {
      await (admin.from("lead_inquiries") as any)
        .update({ status: "cancelled" })
        .eq("lead_id", lead.id)
        .eq("venue_id", venue.id)
        .eq("status", "booked");
    }
  }

  // Handle waitlist notifications
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
    } catch (emailErr) {
      console.error("Failed to send waitlist notify email:", emailErr);
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
