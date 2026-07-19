"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { eventsHistoryCutoffStr, toLocalDateStr } from "@/lib/utils";
import { EventFormModal } from "./EventFormModal";
import { EventDetailModal } from "./EventDetailModal";
import { HebrewCalendar } from "@/components/ui/hebrew-calendar";
import { Combobox } from "@/components/ui/combobox";
import type { EventRow, VenueRow, UserRole } from "@/types/database";
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/types/booking";

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

  // Modal state
  const [addModal, setAddModal] = useState<{ open: boolean; date: Date }>({ open: false, date: new Date() });
  const [detailModal, setDetailModal] = useState<{ open: boolean; event: EventRow | null }>({ open: false, event: null });

  const isAdmin = role === "admin";
  const canCancel = isAdmin || role === "venue_owner";

  // Reload events when venue changes. Must match the server query in
  // CalendarContent (history cutoff, no cancelled) so switching venues and
  // closing modals doesn't change what the calendar shows.
  const loadEvents = useCallback(async (venueId: string) => {
    const { data } = await supabase
      .from("events")
      .select("*, creator:users!created_by(full_name), cancelled_by_user:users!cancelled_by(full_name)")
      .eq("venue_id", venueId)
      .gte("date", eventsHistoryCutoffStr())
      .neq("status", "cancelled")
      .order("date");
    setEvents(data ?? []);
  }, [supabase]);

  // The server already provided the first venue's events, so skip the refetch
  // on mount - only reload when the user switches venues.
  const initialVenueIdRef = useRef<string | null>(venues[0]?.id ?? null);
  useEffect(() => {
    if (!selectedVenueId) return;
    if (initialVenueIdRef.current === selectedVenueId) {
      initialVenueIdRef.current = null;
      return;
    }
    initialVenueIdRef.current = null;
    loadEvents(selectedVenueId);
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

  function handleModalClose() {
    setAddModal((s) => ({ ...s, open: false }));
    setDetailModal({ open: false, event: null });
    loadEvents(selectedVenueId);
  }

  // O(events) once per events change, instead of filtering the whole events
  // array for each of the ~35-42 day cells on every render.
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
              setDetailModal({ open: true, event });
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
  }, [eventsByDay]);

  const dayClassName = useCallback(
    (date: Date) => (bookedDates.has(toLocalDateStr(date)) ? "bg-slate-200" : undefined),
    [bookedDates]
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Venue selector - shown if user has multiple venues */}
      {venues.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">אולם:</span>
          <Combobox
            options={venues.map((v) => ({ value: v.id, label: v.name }))}
            value={selectedVenueId}
            onValueChange={setSelectedVenueId}
            placeholder="בחר אולם"
            searchPlaceholder="הקלד שם אולם..."
            clearable={false}
            className="w-56"
          />
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

      <div className="flex-1 overflow-x-auto">
        <HebrewCalendar
          onSelect={(date) => setAddModal({ open: true, date })}
          renderDay={renderDay}
          dayClassName={dayClassName}
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
