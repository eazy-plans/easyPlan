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

  // See VenueCalendar.tsx for why pending-cancellation-only days get the
  // lighter warning treatment instead of the solid "booked" gray.
  const bookedDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.status === "approved" && !e.cancellation_requested_at) set.add(e.date);
    });
    return set;
  }, [events]);

  const pendingDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.status === "approved" && e.cancellation_requested_at) set.add(e.date);
    });
    for (const date of bookedDates) set.delete(date);
    return set;
  }, [events, bookedDates]);

  const renderDay = useCallback((date: Date) => {
    const dayEvents = eventsByDay.get(toLocalDateStr(date));
    if (!dayEvents?.length) return null;
    return (
      <div className="space-y-1">
        {dayEvents.map((event) => {
          const pending = !!event.cancellation_requested_at;
          return (
            <div
              key={event.id}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event);
              }}
              className={`truncate rounded px-1.5 py-0.5 text-right text-[11px] font-medium leading-tight hover:opacity-80 ${pending ? "border border-dashed border-warning text-warning bg-transparent" : ""}`}
              style={pending ? undefined : { backgroundColor: EVENT_TYPE_COLORS[event.event_type], color: "#fff" }}
              title={`${event.client_name} · ${EVENT_TYPE_LABELS[event.event_type]}${pending ? " · ממתין לביטול, ניתן לתפוס" : ""}`}
            >
              {event.client_name}{pending ? " ⏳" : ""}
            </div>
          );
        })}
      </div>
    );
  }, [eventsByDay, onEventClick]);

  const dayClassName = useCallback(
    (date: Date) => {
      const key = toLocalDateStr(date);
      if (bookedDates.has(key)) return "bg-slate-200";
      if (pendingDates.has(key)) return "bg-warning/10";
      return undefined;
    },
    [bookedDates, pendingDates]
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
