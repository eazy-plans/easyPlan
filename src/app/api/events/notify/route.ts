/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOwnerEventCreatedEmail, sendClientConfirmEmail } from "@/lib/email/sendEventEmails";

// POST /api/events/notify
// body: { eventId: string, type: "owner_event_created" | "client_confirm" }
const BodySchema = z.object({
  eventId: z.uuid(),
  type: z.enum(["owner_event_created", "client_confirm"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { eventId, type } = parsed.data;

  // Verify caller is authenticated (cookie-scoped client, respects RLS).
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Authorization: the caller must be able to see this event under their own
  // RLS policies. Without this, any signed-in user could trigger emails for
  // events belonging to other venues.
  const { data: visibleEvent } = await (authClient.from("events") as any)
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (!visibleEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Reading the venue owner's email and writing email_logs both require crossing
  // RLS boundaries a secretary doesn't have, so use the service-role client for
  // the trusted work after the auth checks above.
  const supabase = createAdminClient();

  // Idempotency: each notification type is sent at most once per event, so a
  // replayed request can't spam the recipient with duplicate emails.
  const { data: alreadySent } = await (supabase.from("email_logs") as any)
    .select("id")
    .eq("event_id", eventId)
    .eq("email_type", type)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();
  if (alreadySent) {
    return NextResponse.json({ ok: true, skipped: "already sent" });
  }

  // Fetch event + venue + owner

  const { data: event, error } = await (supabase.from("events") as any)
    .select("*, venue:venues(*, owner:users!owner_user_id(email, full_name))")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const venue = event.venue;

  if (type === "owner_event_created") {
    const ownerEmail = venue?.owner?.email;
    if (!ownerEmail) return NextResponse.json({ skipped: "no owner email" });

    let emailFailed = false;
    try {
      await sendOwnerEventCreatedEmail(event, venue, ownerEmail);
    } catch {
      emailFailed = true;
    }

    await (supabase.from("email_logs") as any).insert({
      event_id: eventId,
      recipient_email: ownerEmail,
      email_type: "owner_event_created",
      status: emailFailed ? "failed" : "sent",
    });

    if (emailFailed) return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // type === "client_confirm"
  if (!event.client_email) return NextResponse.json({ skipped: "no client email" });

  let emailFailed = false;
  try {
    await sendClientConfirmEmail(event, venue);
  } catch {
    emailFailed = true;
  }

  await (supabase.from("email_logs") as any).insert({
    event_id: eventId,
    recipient_email: event.client_email,
    email_type: "client_confirm",
    status: emailFailed ? "failed" : "sent",
  });

  if (emailFailed) return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
