"use client";

import { useCallback, useMemo } from "react";
import { HebrewCalendar } from "@/components/ui/hebrew-calendar";
import { toLocalDateStr } from "@/lib/utils";
import type { EventRow } from "@/types/database";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/types/booking";

interface Props {
  venueId: string;
  events: EventRow[];
  userId: string;
  isAdmin: boolean;
  onEventClick: (e: EventRow) => void;
  onSlotClick: (d: Date) => void;
}

export function VenueCalendarView({ events, onEventClick, onSlotClick }: Props) {
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const event of events) {
      const bucket = map.get(event.date);
      if (bucket) bucket.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [events]);

  const bookedDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.status === "approved") set.add(e.date);
    });
    return set;
  }, [events]);

  const renderDay = useCallback((date: Date) => {
    const dayEvents = eventsByDay.get(toLocalDateStr(date));
    if (!dayEvents?.length) return null;
    return (
      <div className="space-y-1">
        {dayEvents.map((event) => (
          <div
            key={event.id}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(event);
            }}
            className="truncate rounded px-1.5 py-0.5 text-right text-[11px] font-medium leading-tight hover:opacity-80"
            style={{ backgroundColor: EVENT_TYPE_COLORS[event.event_type], color: "#fff" }}
            title={`${event.client_name} · ${EVENT_TYPE_LABELS[event.event_type]}`}
          >
            {event.client_name}
          </div>
        ))}
      </div>
    );
  }, [eventsByDay, onEventClick]);

  const dayClassName = useCallback(
    (date: Date) => (bookedDates.has(toLocalDateStr(date)) ? "bg-slate-200" : undefined),
    [bookedDates]
  );

  return (
    <div className="overflow-x-auto">
      <HebrewCalendar
        onSelect={(date) => onSlotClick(date)}
        renderDay={renderDay}
        dayClassName={dayClassName}
      />
    </div>
  );
}
