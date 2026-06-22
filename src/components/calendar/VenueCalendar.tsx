"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { he } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { EventFormModal } from "./EventFormModal";
import { EventDetailModal } from "./EventDetailModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EventRow, VenueRow, UserRole } from "@/types/database";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/types/booking";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }), // Sunday
  getDay,
  locales: { he },
});

const MESSAGES = {
  next: "הבא",
  previous: "הקודם",
  today: "היום",
  month: "חודש",
  week: "שבוע",
  day: "יום",
  showMore: (count: number) => `+${count} נוספים`,
};

function eventClassName(event: EventRow) {
  return `event-${event.event_type}`;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: EventRow;
}

function toCalendarEvent(e: EventRow): CalendarEvent {
  const date = new Date(e.date);
  return {
    id: e.id,
    title: e.client_name,
    start: date,
    end: date,
    resource: e,
  };
}

interface VenueCalendarProps {
  venues: Pick<VenueRow, "id" | "name">[];
  initialEvents: EventRow[];
  userId: string;
  role: UserRole;
}

export function VenueCalendar({ venues, initialEvents, userId, role }: VenueCalendarProps) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedVenueId, setSelectedVenueId] = useState(venues[0]?.id ?? "");
  const [events, setEvents] = useState<EventRow[]>(initialEvents.filter((e) => e.venue_id === venues[0]?.id));
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());

  // Modal state
  const [addModal, setAddModal] = useState<{ open: boolean; date: Date }>({ open: false, date: new Date() });
  const [detailModal, setDetailModal] = useState<{ open: boolean; event: EventRow | null }>({ open: false, event: null });

  const isAdmin = role === "admin";
  const canCancel = isAdmin || role === "venue_owner";

  // Reload events when venue changes
  const loadEvents = useCallback(async (venueId: string) => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("venue_id", venueId)
      .order("date") as { data: EventRow[] | null };
    setEvents(data ?? []);
  }, [supabase]);

  useEffect(() => {
    if (selectedVenueId) loadEvents(selectedVenueId);
  }, [selectedVenueId, loadEvents]);

  // Supabase Realtime - reflect changes from other users instantly
  useEffect(() => {
    if (!selectedVenueId) return;

    const channel = supabase
      .channel(`events:venue:${selectedVenueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `venue_id=eq.${selectedVenueId}` },
        () => { loadEvents(selectedVenueId); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedVenueId, loadEvents]);

  function handleSelectSlot({ start }: { start: Date }) {
    setAddModal({ open: true, date: start });
  }

  function handleSelectEvent(calEvent: CalendarEvent) {
    setDetailModal({ open: true, event: calEvent.resource });
  }

  function handleModalClose() {
    setAddModal((s) => ({ ...s, open: false }));
    setDetailModal({ open: false, event: null });
    loadEvents(selectedVenueId);
  }

  const calendarEvents = useMemo(() => events.map(toCalendarEvent), [events]);

  const bookedDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.status === "approved") {
        set.add(e.date);
      }
    });
    return set;
  }, [events]);

  const dayPropGetter = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (bookedDates.has(dateStr)) {
      return { className: "rbc-day-booked" };
    }
    return {};
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Venue selector - shown if user has multiple venues */}
      {venues.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">אולם:</span>
          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
            <SelectTrigger dir="rtl" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {venues.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(Object.entries(EVENT_TYPE_LABELS) as [keyof typeof EVENT_TYPE_COLORS, string][]).map(([type, label]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: EVENT_TYPE_COLORS[type] }} />
            {label}
          </span>
        ))}
      </div>

      <div className="flex-1 min-h-[520px]">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          style={{ height: "100%" }}
          views={["month", "week", "day"]}
          messages={MESSAGES}
          culture="he"
          eventPropGetter={(calEvent) => ({
            className: eventClassName(calEvent.resource),
          })}
          dayPropGetter={dayPropGetter}
          popup
        />
      </div>

      <EventFormModal
        open={addModal.open}
        onClose={handleModalClose}
        date={addModal.date}
        venueId={selectedVenueId}
        userId={userId}
        isAdmin={isAdmin}
      />

      {detailModal.event && (
        <EventDetailModal
          open={detailModal.open}
          onClose={handleModalClose}
          event={detailModal.event}
          isAdmin={isAdmin}
          canCancel={canCancel}
          userId={userId}
        />
      )}
    </div>
  );
}
