"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { CalendarDays, Pencil, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HebrewCalendar } from "@/components/ui/hebrew-calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { formatDate, formatCurrency, toLocalDateStr } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS } from "@/types/booking";
import type { EventStatus, UserRole, EventRow } from "@/types/database";
import { useRouter } from "next/navigation";
import { LeadCardDialog } from "@/components/leads/LeadCardDialog";
import { EventFormModal } from "@/components/calendar/EventFormModal";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";
import { CancellationDialog } from "./CancellationDialog";
import type { VenueRow } from "@/types/database";

type EventWithMetadata = EventRow & {
  venue?: VenueRow | { id: string; name: string; city: string } | null;
  creator?: { full_name: string } | null;
  cancelled_by_user?: { full_name: string } | null;
};

const STATUS_LABELS: Record<EventStatus, string> = {
  approved: "מאושר",
  cancelled: "מבוטל",
};

const STATUS_VARIANT: Record<EventStatus, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  cancelled: "outline",
};

interface EventsTableProps {
  events: EventWithMetadata[];
  role: UserRole;
  userId: string;
}

export function EventsTable({ events: initialEvents, role, userId }: EventsTableProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [search, setSearch] = useState("");
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [isPending, startTransition] = useTransition();
  const [leadDialogEvent, setLeadDialogEvent] = useState<EventWithMetadata | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventWithMetadata | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventWithMetadata | null>(null);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [eventToCancelWithVenue, setEventToCancelWithVenue] = useState<(EventWithMetadata & { venue: VenueRow }) | null>(null);
  const [cancellationLoading, setCancellationLoading] = useState(false);

  useEffect(() => { setEvents(initialEvents); }, [initialEvents]);

  const venues = useMemo(() =>
    [...new Set(events.map(e => e.venue?.id).filter(Boolean))].map(id =>
      events.find(e => e.venue?.id === id)?.venue
    ).filter(Boolean),
    [events]
  );

  const filtered = useMemo(() => {
    const today = toLocalDateStr(new Date());
    const list = events.filter((ev) => {
      const matchVenue = venueFilter === "all" || ev.venue?.id === venueFilter;
      const matchDate = !dateFilter || ev.date === dateFilter;
      // An explicit date wins over the upcoming/past range, otherwise picking
      // a past date while on "upcoming" silently shows nothing.
      const matchTime = !!dateFilter || timeFilter === "all" ||
        (timeFilter === "upcoming" ? ev.date >= today : ev.date < today);
      const q = search.toLowerCase();
      const matchSearch = !q ||
        ev.client_name.toLowerCase().includes(q) ||
        ev.client_phone.includes(q) ||
        (ev.venue?.name ?? "").toLowerCase().includes(q);
      return matchVenue && matchDate && matchTime && matchSearch;
    });
    // Server order is date-ascending; history reads best newest-first
    return timeFilter === "past" && !dateFilter ? list.reverse() : list;
  }, [events, search, venueFilter, dateFilter, timeFilter]);

  async function openCancellationDialog(event: EventWithMetadata) {
    setEventToCancelWithVenue(event as EventWithMetadata & { venue: VenueRow });
    setCancellationDialogOpen(true);
  }

  async function cancelEvent(reason: string) {
    if (!eventToCancelWithVenue) return;

    setCancellationLoading(true);
    try {
      const res = await fetch("/api/events/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventToCancelWithVenue.id,
          cancellationReason: reason,
        }),
      });

      if (!res.ok) {
        // The cancel route reports failures as { error }, and the rethrow is
        // caught by CancellationDialog which renders it inline.
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "שגיאה בביטול האירוע");
      }

      const { notified } = await res.json();
      setEvents((prev) => prev.map((e) => e.id === eventToCancelWithVenue.id ? { ...e, status: "cancelled" } : e));
      toast.success(notified > 0 ? `האירוע בוטל - ${notified} ממתינים עודכנו` : "האירוע בוטל");

      setCancellationDialogOpen(false);
      setEventToCancelWithVenue(null);

      startTransition(() => router.refresh());
    } finally {
      setCancellationLoading(false);
    }
  }

  const canCancel = role === "admin" || role === "secretary";
  const canEdit = role === "admin" || role === "secretary";

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="חיפוש"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as "upcoming" | "past" | "all")}>
          <SelectTrigger dir="rtl" className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="upcoming">אירועים קרובים</SelectItem>
            <SelectItem value="past">אירועי עבר</SelectItem>
            <SelectItem value="all">כל האירועים</SelectItem>
          </SelectContent>
        </Select>
        <Select value={venueFilter} onValueChange={setVenueFilter}>
          <SelectTrigger dir="rtl" className="w-full sm:w-44">
            <SelectValue placeholder="כל האולמות" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כל האולמות</SelectItem>
            {venues.map((venue) => (
              <SelectItem key={venue?.id} value={venue?.id || ""}>
                {venue?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Hebrew calendar picker like the rest of the app - the native date
            input was the only Gregorian-first control on this screen */}
        <div className="flex gap-1 w-full sm:w-auto">
          <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 flex-1 sm:flex-initial sm:w-44 justify-between font-normal">
                {dateFilter ? formatDate(new Date(dateFilter + "T12:00:00")) : "סינון לפי תאריך"}
                <CalendarDays size={16} className="text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[660px]" dir="rtl">
              <DialogHeader>
                <DialogTitle>סינון לפי תאריך</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <HebrewCalendar
                  compact
                  selected={dateFilter ? new Date(dateFilter + "T12:00:00") : undefined}
                  onSelect={(d) => {
                    setDateFilter(d ? toLocalDateStr(d) : "");
                    setDateDialogOpen(false);
                  }}
                />
              </DialogBody>
            </DialogContent>
          </Dialog>
          {dateFilter && (
            <Button variant="ghost" size="sm" className="px-2 self-center" onClick={() => setDateFilter("")} aria-label="נקה סינון תאריך">
              <X size={16} />
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} אירועים</p>

      {/* Scrollable table area */}
      <div className="flex-1 overflow-auto min-h-0">

      {/* Table (desktop) */}
      <div className="hidden md:block rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground sticky top-0 z-10">
            <tr>
              <th className="text-right px-4 py-3 font-medium">תאריך</th>
              <th className="text-right px-4 py-3 font-medium">אולם</th>
              <th className="text-right px-4 py-3 font-medium">לקוח</th>
              <th className="text-right px-4 py-3 font-medium">סוג</th>
              <th className="text-right px-4 py-3 font-medium">מחיר סופי</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              <th className="text-right px-4 py-3 font-medium">הערות</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-muted-foreground">אין אירועים תואמים</td>
              </tr>
            )}
            {filtered.map((ev) => (
              <tr
                key={ev.id}
                className="border-t hover:bg-muted/40 transition-colors cursor-pointer focus-visible:bg-muted/40 focus-visible:outline-none"
                onClick={() => setDetailEvent(ev)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") setDetailEvent(ev); }}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>{formatDate(new Date(ev.date))}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(ev.date), "EEEE", { locale: he })}</div>
                  <div className="text-xs text-muted-foreground">{toHebrewDateShort(ev.date)}</div>
                </td>
                <td className="px-4 py-3">
                  {ev.venue?.id ? (
                    <Link
                      href={`/venues/${ev.venue.id}`}
                      className="font-medium hover:underline text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ev.venue.name}
                    </Link>
                  ) : (
                    <div className="font-medium">-</div>
                  )}
                  <div className="text-muted-foreground text-xs">{ev.venue?.city}</div>
                </td>
                {/* stopPropagation: without it the row's onClick also fires and
                    stacks the detail modal on top of the lead dialog */}
                <td
                  className="px-4 py-3 cursor-pointer hover:text-primary transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLeadDialogEvent(ev); }}
                >
                  <div className="font-medium">{ev.client_name}</div>
                  <div className="text-muted-foreground text-xs" dir="ltr">{ev.client_phone}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{EVENT_TYPE_LABELS[ev.event_type as keyof typeof EVENT_TYPE_LABELS] ?? ev.event_type}</div>
                  <div className="text-xs text-muted-foreground">{EVENT_PURPOSE_LABELS[ev.event_purpose as keyof typeof EVENT_PURPOSE_LABELS] ?? ev.event_purpose}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(ev.price_final)}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[ev.status]}>{STATUS_LABELS[ev.status]}</Badge>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  {ev.notes ? (
                    <span className="text-sm text-muted-foreground truncate block">{ev.notes}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">-</span>
                  )}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
                    {canEdit && ev.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" onClick={() => setEditingEvent(ev)} disabled={isPending}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canCancel && ev.status !== "cancelled" && (
                      <Button size="sm" variant="outline" onClick={() => openCancellationDialog(ev)} disabled={cancellationLoading || isPending}>
                        בטל
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <p className="text-center py-10 text-muted-foreground">אין אירועים תואמים</p>
        )}
        {filtered.map((ev) => (
          <div
            key={ev.id}
            role="button"
            tabIndex={0}
            className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/40 transition-colors focus-visible:bg-muted/40 focus-visible:outline-none"
            onClick={() => setDetailEvent(ev)}
            onKeyDown={(e) => { if (e.key === "Enter") setDetailEvent(ev); }}
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                className="text-right hover:text-primary transition-colors"
                onClick={(e) => { e.stopPropagation(); setLeadDialogEvent(ev); }}
              >
                <p className="font-semibold">{ev.client_name}</p>
                <p className="text-sm text-muted-foreground" dir="ltr">{ev.client_phone}</p>
              </button>
              <Badge variant={STATUS_VARIANT[ev.status]}>{STATUS_LABELS[ev.status]}</Badge>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">תאריך</span>
                <div className="flex flex-col items-end">
                  <span>{formatDate(new Date(ev.date))} · {format(new Date(ev.date), "EEEE", { locale: he })}</span>
                  <span className="text-xs text-muted-foreground">{toHebrewDateShort(ev.date)}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">אולם</span>
                {ev.venue?.id ? (
                  <Link
                    href={`/venues/${ev.venue.id}`}
                    className="hover:underline text-primary font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ev.venue.name}
                  </Link>
                ) : (
                  <span>-</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">סוג</span>
                <span>{EVENT_TYPE_LABELS[ev.event_type as keyof typeof EVENT_TYPE_LABELS] ?? ev.event_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">מחיר</span>
                <span className="font-medium">{formatCurrency(ev.price_final)}</span>
              </div>
              {ev.notes && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">הערות</span>
                  <span className="text-sm">{ev.notes}</span>
                </div>
              )}
              {ev.creator?.full_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">יוצר</span>
                  <span>{ev.creator.full_name}</span>
                </div>
              )}
              {ev.status === "cancelled" && ev.cancelled_by_user?.full_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">בוטל על ידי</span>
                  <span>{ev.cancelled_by_user.full_name}</span>
                </div>
              )}
            </div>
            {(canEdit || canCancel) && ev.status !== "cancelled" && (
              <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                {canEdit && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingEvent(ev)} disabled={isPending}>
                    <Pencil className="h-4 w-4 ml-1" />ערוך
                  </Button>
                )}
                {canCancel && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openCancellationDialog(ev)} disabled={cancellationLoading || isPending}>
                    בטל
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      </div>{/* end scrollable area */}

      {leadDialogEvent && (
        <LeadCardDialog
          open={!!leadDialogEvent}
          onClose={() => setLeadDialogEvent(null)}
          clientPhone={leadDialogEvent.client_phone}
          clientName={leadDialogEvent.client_name}
          clientEmail={leadDialogEvent.client_email}
          venueId={leadDialogEvent.venue?.id ?? ""}
        />
      )}

      {editingEvent && (
        <EventFormModal
          open={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          date={new Date(editingEvent.date)}
          venueId={editingEvent.venue?.id ?? ""}
          userId={userId}
          isAdmin={role === "admin"}
          event={editingEvent}
          onSaved={() => startTransition(() => router.refresh())}
        />
      )}

      {eventToCancelWithVenue && (
        <CancellationDialog
          event={eventToCancelWithVenue}
          open={cancellationDialogOpen}
          onClose={() => {
            setCancellationDialogOpen(false);
            setEventToCancelWithVenue(null);
          }}
          onConfirm={cancelEvent}
          isLoading={cancellationLoading}
        />
      )}

      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          open={!!detailEvent}
          onClose={() => setDetailEvent(null)}
          isAdmin={role === "admin"}
          canCancel={canCancel}
          userId={userId}
          venueAddress={(detailEvent.venue as VenueRow)?.address}
          venueCity={(detailEvent.venue as VenueRow)?.city}
        />
      )}
    </div>
  );
}
