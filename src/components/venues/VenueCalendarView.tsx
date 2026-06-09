"use client";

import { useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { he } from "date-fns/locale";
import type { EventRow } from "@/types/database";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/types/booking";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/components/calendar/calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
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
  showMore: (n: number) => `+${n} נוספים`,
};

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: EventRow;
}

interface Props {
  venueId: string;
  events: EventRow[];
  userId: string;
  isAdmin: boolean;
  onEventClick: (e: EventRow) => void;
  onSlotClick: (d: Date) => void;
}

export function VenueCalendarView({ events, onEventClick, onSlotClick }: Props) {
  const [view, setView]   = useState<View>("month");
  const [date, setDate]   = useState(new Date());

  const calEvents = useMemo<CalEvent[]>(() =>
    events.map((e) => {
      const d = new Date(e.date);
      return { id: e.id, title: e.client_name, start: d, end: d, resource: e };
    }),
  [events]);

  return (
    <>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
        {(Object.entries(EVENT_TYPE_LABELS) as [keyof typeof EVENT_TYPE_COLORS, string][]).map(([type, label]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: EVENT_TYPE_COLORS[type] }} />
            {label}
          </span>
        ))}
      </div>
      <Calendar
        localizer={localizer}
        events={calEvents}
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        onSelectSlot={({ start }) => onSlotClick(start as Date)}
        onSelectEvent={(ce: CalEvent) => onEventClick(ce.resource)}
        selectable
        style={{ height: 520 }}
        views={["month", "week"]}
        messages={MESSAGES}
        culture="he"
        eventPropGetter={(ce: CalEvent) => ({
          className: `event-${ce.resource.event_type}`,
        })}
        popup
      />
    </>
  );
}
