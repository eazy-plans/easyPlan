/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { EventsTable } from "@/components/events/EventsTable";
import { toLocalDateStr } from "@/lib/utils";

export async function EventsContent() {
  const { supabase, user, profile } = await getUserProfile();
  const role = profile.role;

  // Bound the fetch to a rolling window - the page used to load every event
  // ever created, which degrades linearly as history accumulates. Two years of
  // history covers all operational lookups; widen the window if older records
  // are ever needed on this page.
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);

  // The embedded venue must include the cancellation policy fields -
  // CancellationDialog computes its refund preview from them (with only
  // id/name/city the preview always showed 0) - and address, which
  // EventDetailModal displays.
  let query = (supabase.from("events") as any)
    .select("*, venue:venues(id, name, city, address, cancellation_policy_type, cancellation_deadline_days, cancellation_fee_percent, refund_details), creator:users!created_by(full_name), cancelled_by_user:users!cancelled_by(full_name)")
    .gte("date", toLocalDateStr(cutoff))
    .order("date", { ascending: true });

  if (role === "venue_owner") {
    const { data: myVenues } = await (supabase.from("venues") as any)
      .select("id")
      .eq("owner_user_id", user.id);
    const ids = (myVenues ?? []).map((v: { id: string }) => v.id);
    if (ids.length === 0) {
      return <p className="text-muted-foreground">אין אולמות ברשותך.</p>;
    }
    query = query.in("venue_id", ids);
  }

  const { data: events } = await query;

  return <EventsTable events={events ?? []} role={role} userId={user.id} />;
}
