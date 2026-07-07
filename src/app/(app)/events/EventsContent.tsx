/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { EventsTable } from "@/components/events/EventsTable";
import { eventsHistoryCutoffStr } from "@/lib/utils";

export async function EventsContent() {
  const { supabase, user, profile } = await getUserProfile();
  const role = profile.role;

  // The embedded venue must include cancellation_policy - CancellationDialog
  // displays it - and address, which EventDetailModal displays.
  let query = (supabase.from("events") as any)
    .select("*, venue:venues(id, name, city, address, cancellation_policy), creator:users!created_by(full_name), cancelled_by_user:users!cancelled_by(full_name)")
    .gte("date", eventsHistoryCutoffStr())
    .order("date", { ascending: true });

  if (role === "venue_owner") {
    const { data: myVenues, error: venuesError } = await (supabase.from("venues") as any)
      .select("id")
      .eq("owner_user_id", user.id);
    if (venuesError) throw new Error(`Failed to load venues: ${venuesError.message}`);
    const ids = (myVenues ?? []).map((v: { id: string }) => v.id);
    if (ids.length === 0) {
      return <p className="text-muted-foreground">אין אולמות ברשותך.</p>;
    }
    query = query.in("venue_id", ids);
  }

  const { data: events, error } = await query;
  if (error) throw new Error(`Failed to load events: ${error.message}`);

  return <EventsTable events={events ?? []} role={role} userId={user.id} />;
}
