/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { EventsTable } from "@/components/events/EventsTable";

export default async function EventsPage() {
  const { supabase, user, profile } = await getUserProfile();
  const role = profile.role;


  let query = (supabase.from("events") as any)
    .select("*, venue:venues(id, name, city), creator:users!created_by(full_name)")
    .order("date", { ascending: true });

  // Venue owners see only their venues' events
  if (role === "venue_owner") {
  
    const { data: myVenues } = await (supabase.from("venues") as any)
      .select("id")
      .eq("owner_user_id", user.id);
    const ids = (myVenues ?? []).map((v: { id: string }) => v.id);
    if (ids.length === 0) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">ניהול אירועים</h1>
          <p className="text-muted-foreground">אין אולמות ברשותך.</p>
        </div>
      );
    }
    query = query.in("venue_id", ids);
  }

  const { data: events } = await query;

  return (
    <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0">
      <h1 className="text-2xl font-bold mb-6">ניהול אירועים</h1>
      <EventsTable events={events ?? []} role={role} />
    </div>
  );
}
