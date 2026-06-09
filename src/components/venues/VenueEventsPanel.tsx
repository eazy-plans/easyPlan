/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";
import { EventFormModal } from "@/components/calendar/EventFormModal";
import type { EventRow } from "@/types/database";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, EVENT_PURPOSE_LABELS } from "@/types/booking";
import { formatDate, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarDays, List } from "lucide-react";

// Lazy-load the heavy calendar to avoid SSR issues
const VenueCalendarView = dynamic(() => import("./VenueCalendarView").then((m) => ({ default: m.VenueCalendarView })), { ssr: false });

const STATUS_LABELS: Record<string, string> = { approved: "מאושר", cancelled: "בוטל" };
const STATUS_VARIANTS: Record<string, "default" | "outline" | "destructive"> = { approved: "default", cancelled: "outline" };

interface Props {
  venueId: string;
  initialEvents: EventRow[];
  userId: string;
  isAdmin: boolean;
}

export function VenueEventsPanel({ venueId, initialEvents, userId, isAdmin }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents]       = useState<EventRow[]>(initialEvents);
  const [viewMode, setViewMode]   = useState<"calendar" | "list">("calendar");
  const [showPast, setShowPast]   = useState(false);
  const [addModal, setAddModal]   = useState<{ open: boolean; date: Date }>({ open: false, date: new Date() });
  const [detail, setDetail]       = useState<{ open: boolean; event: EventRow | null }>({ open: false, event: null });

  const loadEvents = useCallback(async () => {
    const { data } = await (supabase.from("events") as any)
      .select("*")
      .eq("venue_id", venueId)
      .order("date");
    setEvents(data ?? []);
  }, [supabase, venueId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`venue-events-panel:${venueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `venue_id=eq.${venueId}` }, loadEvents)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, venueId, loadEvents]);

  function closeModals() {
    setAddModal((s) => ({ ...s, open: false }));
    setDetail({ open: false, event: null });
    loadEvents();
  }

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const upcoming = events.filter((e) => new Date(e.date) >= today && e.status !== "cancelled");
  const past     = events.filter((e) => new Date(e.date) < today || e.status === "cancelled");
  const listItems = showPast ? [...upcoming, ...past] : upcoming;

  return (
    <div className="flex flex-col gap-4 min-h-0">
      {/* View toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <CalendarDays size={14} />
            לוח
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-r ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <List size={14} />
            רשימה
          </button>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddModal({ open: true, date: new Date() })}>
            + אירוע חדש
          </Button>
        )}
      </div>

      {viewMode === "calendar" ? (
        <div className="min-h-[560px]">
          <VenueCalendarView
            venueId={venueId}
            events={events}
            userId={userId}
            isAdmin={isAdmin}
            onEventClick={(e) => setDetail({ open: true, event: e })}
            onSlotClick={(d) => isAdmin && setAddModal({ open: true, date: d })}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {listItems.length} אירועים {showPast ? "" : "(קרובים בלבד)"}
            </p>
            <button
              type="button"
              onClick={() => setShowPast(!showPast)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {showPast ? "הסתר עבר" : `הצג גם ${past.length} אירועים שעברו`}
            </button>
          </div>

          {listItems.length === 0 && (
            <p className="text-center py-10 text-muted-foreground">אין אירועים קרובים</p>
          )}

          <div className="space-y-2">
            {listItems.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setDetail({ open: true, event: ev })}
                className="w-full border rounded-lg p-4 text-right hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{ev.client_name}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
                        style={{ backgroundColor: EVENT_TYPE_COLORS[ev.event_type] }}
                      >
                        {EVENT_TYPE_LABELS[ev.event_type]}
                      </span>
                      <Badge variant={STATUS_VARIANTS[ev.status] ?? "outline"} className="text-xs shrink-0">
                        {STATUS_LABELS[ev.status] ?? ev.status}
                      </Badge>
                    </div>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>{formatDate(new Date(ev.date))} · {format(new Date(ev.date), "EEEE", { locale: he })}</span>
                      <span dir="ltr">{ev.client_phone}</span>
                      <span>{EVENT_PURPOSE_LABELS[ev.event_purpose]}</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">{formatCurrency(Number(ev.price_final))}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <EventFormModal
        open={addModal.open}
        onClose={closeModals}
        date={addModal.date}
        venueId={venueId}
        userId={userId}
        isAdmin={isAdmin}
      />

      {detail.event && (
        <EventDetailModal
          open={detail.open}
          onClose={closeModals}
          event={detail.event}
          isAdmin={isAdmin}
          canCancel={isAdmin}
          userId={userId}
        />
      )}
    </div>
  );
}
