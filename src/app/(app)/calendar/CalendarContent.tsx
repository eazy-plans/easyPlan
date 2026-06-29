import { getUserProfile } from "@/lib/supabase/queries";
import { VenueCalendarClient } from "@/components/calendar/VenueCalendarClient";
import type { VenueRow, EventRow, UserRole } from "@/types/database";

export async function CalendarContent() {
  const { supabase, user, profile } = await getUserProfile();
  const role = profile.role as UserRole;

  const venueQuery = supabase.from("venues").select("id, name").eq("is_active", true).order("name");
  if (role === "venue_owner") venueQuery.eq("owner_user_id", user.id);

  const { data: venues } = await venueQuery as { data: VenueRow[] | null };

  if (!venues?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-2">
        <p className="text-lg font-medium">אין אולמות מקושרים לחשבון שלך</p>
        <p className="text-sm">צור קשר עם המנהל להוספת אולם</p>
      </div>
    );
  }

  const venueIds = venues.map((v) => v.id);
  const { data: events } = await (supabase as any)
    .from("events")
    .select("*, creator:users!created_by(full_name), cancelled_by_user:users!cancelled_by(full_name)")
    .in("venue_id", venueIds)
    .neq("status", "cancelled")
    .order("date") as { data: (EventRow & { creator?: { full_name: string } | null; cancelled_by_user?: { full_name: string } | null })[] | null };

  return (
    <VenueCalendarClient
      venues={venues as Pick<VenueRow, "id" | "name">[]}
      initialEvents={events ?? []}
      userId={user.id}
      role={role}
    />
  );
}
