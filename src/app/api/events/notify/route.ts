/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOwnerEventCreatedEmail, sendClientConfirmEmail } from "@/lib/email/sendEventEmails";

// POST /api/events/notify
// body: { eventId: string, type: "owner_event_created" | "client_confirm" }
export async function POST(request: Request) {
  const { eventId, type } = await request.json();
  if (!eventId || !type) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Verify caller is authenticated (cookie-scoped client, respects RLS).
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Reading the venue owner's email and writing email_logs both require crossing
  // RLS boundaries a secretary doesn't have, so use the service-role client for
  // the trusted work after the auth check above.
  const supabase = createAdminClient();

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

  if (type === "client_confirm") {
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

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
