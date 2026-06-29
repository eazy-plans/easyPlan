/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistNotifyEmail, sendCancellationEmail } from "@/lib/email/sendEventEmails";
import { calculateRefund } from "@/lib/cancellation/refundCalculator";

// POST /api/events/cancel
// body: { eventId: string, cancellationReason?: string }
export async function POST(request: Request) {
  const { eventId, cancellationReason } = await request.json();
  if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

  // Cookie-scoped client: getUser + the event read/update stay under RLS, so the
  // existing "who may cancel which event" row policies keep applying.
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch full event details with venue for refund calculation
  const { data: event, error: fetchErr } = await (supabase.from("events") as any)
    .select("id, venue_id, date, status, client_name, client_phone, client_email, price_final, booking_date, original_price_final, notes, venues(id, name, city, owner_user_id, cancellation_policy_type, cancellation_deadline_days, cancellation_fee_percent, refund_details, owner:users(full_name, phone))")
    .eq("id", eventId)
    .single();

  if (fetchErr || !event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.status === "cancelled") return NextResponse.json({ ok: true, notified: 0 });

  // Prepare event and venue for refund calculation
  const venue = event.venues;
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  // Store original price if not already set
  const originalPrice = event.original_price_final || event.price_final;

  // Prepare full event object for refund calculation
  const eventForRefund = {
    ...event,
    booking_date: event.booking_date || new Date().toISOString(),
    original_price_final: originalPrice,
  };

  // Calculate refund
  const refundCalc = calculateRefund(eventForRefund, venue);

  // Calculate refund date (7-10 business days from now)
  const refundDate = new Date();
  refundDate.setDate(refundDate.getDate() + 7);

  // Update event with cancellation details
  const { error: updateErr } = await (supabase.from("events") as any)
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: cancellationReason || null,
      refund_amount: refundCalc.refundAmount,
      original_price_final: originalPrice,
      refund_date: refundDate.toISOString(),
    })
    .eq("id", eventId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Use admin client for email logs and other admin-only operations
  const admin = createAdminClient();

  // Send cancellation email to client
  try {
    await sendCancellationEmail(event, venue, refundCalc.refundAmount, cancellationReason);

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

  // Update linked lead_inquiry status to cancelled (if exists)
  try {
    const { data: leadInquiry } = await (admin.from("lead_inquiries") as any)
      .select("id")
      .eq("venue_id", venue.id)
      .eq("status", "booked")
      .limit(1)
      .single();

    if (leadInquiry) {
      await (admin.from("lead_inquiries") as any)
        .update({ status: "cancelled" })
        .eq("id", leadInquiry.id);
    }
  } catch {
    // Lead inquiry might not exist, that's okay
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
