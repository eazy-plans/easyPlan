/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { EventsTable } from "@/components/events/EventsTable";

export async function EventsContent() {
  const { supabase, user, profile } = await getUserProfile();
  const role = profile.role;

  let query = (supabase.from("events") as any)
    .select("*, venue:venues(id, name, city), creator:users!created_by(full_name)")
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
