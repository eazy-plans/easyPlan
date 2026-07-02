/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUserProfile } from "@/lib/supabase/queries";
import { VenueCalendarClient } from "@/components/calendar/VenueCalendarClient";
import { eventsHistoryCutoffStr } from "@/lib/utils";
import type { VenueRow, EventRow, UserRole } from "@/types/database";

export async function CalendarContent() {
  const { supabase, user, profile } = await getUserProfile();
  const role = profile.role as UserRole;

  const venueQuery = supabase.from("venues").select("id, name").eq("is_active", true).order("name");
  if (role === "venue_owner") venueQuery.eq("owner_user_id", user.id);

  const { data: venues, error: venuesError } = await venueQuery as unknown as { data: VenueRow[] | null; error: { message: string } | null };
  if (venuesError) throw new Error(`Failed to load venues: ${venuesError.message}`);

  if (!venues?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-2">
        <p className="text-lg font-medium">אין אולמות מקושרים לחשבון שלך</p>
        <p className="text-sm">צור קשר עם המנהל להוספת אולם</p>
      </div>
    );
  }

  // The calendar shows one venue at a time and defaults to the first, so only
  // that venue's events are fetched here - VenueCalendar loads other venues on
  // selection. Bounded to a rolling history window like the events page.
  const { data: events, error: eventsError } = await (supabase as any)
    .from("events")
    .select("*, creator:users!created_by(full_name), cancelled_by_user:users!cancelled_by(full_name)")
    .eq("venue_id", venues[0].id)
    .gte("date", eventsHistoryCutoffStr())
    .neq("status", "cancelled")
    .order("date") as { data: (EventRow & { creator?: { full_name: string } | null; cancelled_by_user?: { full_name: string } | null })[] | null; error: { message: string } | null };
  if (eventsError) throw new Error(`Failed to load events: ${eventsError.message}`);

  return (
    <VenueCalendarClient
      venues={venues as Pick<VenueRow, "id" | "name">[]}
      initialEvents={events ?? []}
      userId={user.id}
      role={role}
    />
  );
}
