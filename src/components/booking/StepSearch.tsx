/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Building2, Search, CalendarDays, X, ChevronDown, Clock } from "lucide-react";
import Image from "next/image";
import { he } from "date-fns/locale";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { EventType, VenueRow, VenueImageRow } from "@/types/database";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, PRICE_KEY } from "@/types/booking";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
function getImageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/venue-images/${path}`;
}

const toLocalDateStr = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);

interface StepSearchProps {
  userId: string;
  onSelect: (venue: VenueWithImages, date: Date | null, eventType: EventType | null) => void;
}

export function StepSearch({ userId, onSelect }: StepSearchProps) {
  const [venueInput, setVenueInput]       = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [venueOpen, setVenueOpen]         = useState(false);
  const venueRef                          = useRef<HTMLDivElement>(null);
  const [selectedCity, setSelectedCity]   = useState("");
  const [eventType, setEventType]         = useState<EventType | null>(null);
  const [date, setDate]                   = useState<Date | null>(null);

  const [allVenues, setAllVenues]         = useState<VenueWithImages[]>([]);
  const [bookedSet, setBookedSet]         = useState<Set<string>>(new Set());
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingAvail, setLoadingAvail]   = useState(false);
  const [activeLocks, setActiveLocks]     = useState<{ venue_id: string; date: string; event_type: EventType; locked_until: string }[]>([]);
  const [showHolds, setShowHolds]         = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (supabase.from("venues") as any)
      .select("*, images:venue_images(*)")
      .eq("is_active", true)
      .order("name")
      .then(({ data }: any) => { setAllVenues(data ?? []); setLoadingVenues(false); });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (venueRef.current && !venueRef.current.contains(e.target as Node)) setVenueOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLocks = useCallback(async () => {
    const supabase = createClient();
    const { data } = await (supabase.from("booking_locks") as any)
      .select("venue_id, date, event_type, locked_until")
      .gt("locked_until", new Date().toISOString());
    setActiveLocks(data ?? []);
  }, []);

  useEffect(() => { fetchLocks(); }, [fetchLocks]);
  useEffect(() => {
    const id = setInterval(fetchLocks, 30000);
    return () => clearInterval(id);
  }, [fetchLocks]);

  const fetchAvailability = useCallback(async (d: Date, et: EventType) => {
    setLoadingAvail(true);
    const supabase = createClient();
    const dateStr   = toLocalDateStr(d);
    const isShabbat = et === "shabbat";
    const prev      = new Date(d);
    prev.setDate(prev.getDate() - 1);
    const prevStr   = toLocalDateStr(prev);
    const nowIso    = new Date().toISOString();

    const [{ data: evts }, { data: locks }] = await Promise.all([
      isShabbat
        ? (supabase.from("events") as any).select("venue_id,event_type,date").in("date", [dateStr, prevStr]).neq("status", "cancelled")
        : (supabase.from("events") as any).select("venue_id,event_type,date").eq("date", dateStr).neq("status", "cancelled"),
      isShabbat
        ? (supabase.from("booking_locks") as any).select("venue_id,event_type,date").in("date", [dateStr, prevStr]).gt("locked_until", nowIso).neq("locked_by_user_id", userId)
        : (supabase.from("booking_locks") as any).select("venue_id,event_type,date").eq("date", dateStr).gt("locked_until", nowIso).neq("locked_by_user_id", userId),
    ]);

    const blocked = new Set<string>();
    for (const ev of [...(evts ?? []), ...(locks ?? [])]) {
      blocked.add(`${ev.venue_id}:${ev.event_type}`);
      if (ev.event_type === "full_day") {
        blocked.add(`${ev.venue_id}:morning`);
        blocked.add(`${ev.venue_id}:evening`);
      }
      if (ev.event_type === "morning" || ev.event_type === "evening") blocked.add(`${ev.venue_id}:full_day`);
      if (ev.event_type === "shabbat")                                 blocked.add(`${ev.venue_id}:evening_friday`);
      if (ev.event_type === "evening" && ev.date === prevStr)          blocked.add(`${ev.venue_id}:shabbat`);
    }
    setBookedSet(blocked);
    setLoadingAvail(false);
  }, [userId]);

  useEffect(() => {
    if (date && eventType) fetchAvailability(date, eventType);
    else setBookedSet(new Set());
  }, [date, eventType, fetchAvailability]);

  const isFriday   = (d: Date) => d.getDay() === 5;
  const isSaturday = (d: Date) => d.getDay() === 6;

  const calDisabled = (d: Date) => {
    if (d < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    if (eventType === "shabbat" && !isSaturday(d)) return true;
    if ((eventType === "evening" || eventType === "full_day") && (isFriday(d) || isSaturday(d))) return true;
    return false;
  };

  const handleDateSelect = (d: Date | undefined) => {
    const sel = d ?? null;
    if (sel && isSaturday(sel)) setEventType("shabbat");
    else if (sel && isFriday(sel) && (eventType === "evening" || eventType === "full_day")) setEventType(null);
    else if (sel && !isFriday(sel) && !isSaturday(sel) && eventType === "shabbat") setEventType(null);
    setDate(sel);
  };

  const handleEventType = (type: EventType) => {
    const next = eventType === type ? null : type;
    if (next === "shabbat" && date && !isSaturday(date)) setDate(null);
    if ((next === "evening" || next === "full_day") && date && (isFriday(date) || isSaturday(date))) setDate(null);
    setEventType(next);
  };

  const uniqueCities = [...new Set(allVenues.map((v) => v.city))].sort();

  const venueMatches = allVenues.filter((v) =>
    venueInput && !selectedVenueId
      ? v.name.toLowerCase().includes(venueInput.toLowerCase())
      : false
  );

  const selectedVenueName = selectedVenueId
    ? allVenues.find((v) => v.id === selectedVenueId)?.name ?? ""
    : "";

  function selectVenue(v: VenueWithImages) {
    setSelectedVenueId(v.id);
    setVenueInput(v.name);
    setVenueOpen(false);
  }

  function clearVenue() {
    setSelectedVenueId("");
    setVenueInput("");
  }

  const filtered = allVenues.filter((v) => {
    if (selectedVenueId && v.id !== selectedVenueId) return false;
    if (selectedCity && v.city !== selectedCity) return false;
    if (date && eventType && bookedSet.has(`${v.id}:${eventType}`)) return false;
    return true;
  });

  const filteredWithoutDate = allVenues.filter((v) => {
    if (selectedVenueId && v.id !== selectedVenueId) return false;
    if (selectedCity && v.city !== selectedCity) return false;
    return true;
  });

  const hasDateFilter = !!date && !!eventType;
  const anyFilter = !!selectedVenueId || !!selectedCity || !!eventType || !!date;
  const allTakenOnDate = hasDateFilter && filtered.length === 0 && filteredWithoutDate.length > 0;

  return (
    <div className="flex flex-col min-h-full gap-4">

      {/* Venue name combobox */}
      <div className="relative" ref={venueRef}>
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
        <Input
          placeholder="בחר אולם..."
          value={venueInput}
          onChange={(e) => {
            setVenueInput(e.target.value);
            setSelectedVenueId("");
            setVenueOpen(true);
          }}
          onFocus={() => { if (!selectedVenueId) setVenueOpen(true); }}
          className="pr-9 pl-8"
          readOnly={!!selectedVenueId}
        />
        {selectedVenueId ? (
          <button
            type="button"
            onClick={clearVenue}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        )}
        {venueOpen && venueMatches.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-background border rounded-lg shadow-md max-h-52 overflow-y-auto">
            {venueMatches.map((v) => (
              <button
                key={v.id}
                type="button"
                className="w-full text-right px-3 py-2 text-sm hover:bg-muted transition-colors block"
                onMouseDown={(e) => { e.preventDefault(); selectVenue(v); }}
              >
                <span className="font-medium">{v.name}</span>
                <span className="text-muted-foreground mr-2 text-xs">{v.city}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City pills */}
      {!loadingVenues && uniqueCities.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {uniqueCities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(selectedCity === city ? "" : city)}
              className={`px-3 py-1 rounded-full text-sm border transition-all ${
                selectedCity === city
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/50"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      {/* Event type chips */}
      <div className="flex gap-2 flex-wrap">
        {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => handleEventType(type)}
            className="border rounded-full px-3 py-1 text-sm font-medium transition-all whitespace-nowrap"
            style={{
              borderColor: EVENT_TYPE_COLORS[type],
              backgroundColor: eventType === type ? EVENT_TYPE_COLORS[type] : "transparent",
              color: eventType === type ? "#fff" : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarDays size={14} className="text-muted-foreground" />
              {date ? formatDate(date) : "בחר תאריך"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date ?? undefined}
              onSelect={handleDateSelect}
              locale={he}
              weekStartsOn={0}
              disabled={calDisabled}
            />
          </PopoverContent>
        </Popover>
        {date && (
          <button
            type="button"
            onClick={() => { setDate(null); setBookedSet(new Set()); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X size={12} /> נקה תאריך
          </button>
        )}
        {anyFilter && (
          <button
            type="button"
            onClick={() => { clearVenue(); setSelectedCity(""); setEventType(null); setDate(null); setBookedSet(new Set()); }}
            className="text-xs text-muted-foreground hover:text-foreground mr-auto"
          >
            נקה הכל
          </button>
        )}
      </div>

      {/* Results */}
      <p className="text-sm text-muted-foreground">
        {loadingVenues  ? "טוען אולמות..." :
         loadingAvail   ? "בודק זמינות..." :
         hasDateFilter  ? `${filtered.length} אולמות פנויים` :
         `${filtered.length} אולמות`}
      </p>

      {/* Active holds panel */}
      {activeLocks.length > 0 && (
        <div className="border border-amber-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHolds((h) => !h)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock size={14} />
              {activeLocks.length} {activeLocks.length === 1 ? "אולם" : "אולמות"} בהמתנה כרגע
            </span>
            <ChevronDown size={14} className={`transition-transform ${showHolds ? "rotate-180" : ""}`} />
          </button>
          {showHolds && (
            <div className="divide-y divide-amber-100">
              {activeLocks.map((lock, i) => {
                const venueName = allVenues.find((v) => v.id === lock.venue_id)?.name ?? "אולם לא ידוע";
                const minsLeft = Math.max(0, Math.round((new Date(lock.locked_until).getTime() - Date.now()) / 60000));
                return (
                  <div key={i} className="px-3 py-2 text-sm flex items-center justify-between bg-amber-50/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{venueName}</span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {formatDate(new Date(lock.date + "T12:00:00"))} · {EVENT_TYPE_LABELS[lock.event_type]}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 shrink-0 mr-2">
                      {minsLeft} דק&apos;
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loadingVenues && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
            <Building2 size={40} strokeWidth={1} />
            {allTakenOnDate ? (
              <>
                <p className="font-medium text-foreground">התאריך תפוס</p>
                <p className="text-sm text-center">כל האולמות תפוסים בתאריך זה לסוג האירוע שנבחר</p>
              </>
            ) : (
              <p>לא נמצאו אולמות</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((venue) => {
              const primaryImage = venue.images.find((i) => i.is_primary) ?? venue.images[0];
              const price = eventType ? Number(venue[PRICE_KEY[eventType]] ?? 0) : null;
              return (
                <div
                  key={venue.id}
                  className="border rounded-lg p-4 flex gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onSelect(venue, date, eventType)}
                >
                  <div className="w-20 h-20 rounded-md bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                    {primaryImage ? (
                      <Image src={getImageUrl(primaryImage.storage_path)} alt={venue.name} width={80} height={80} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={28} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold truncate">{venue.name}</h3>
                      <Badge variant="outline" className="shrink-0">{venue.max_capacity} אורחים</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
                    </p>
                    {price !== null && price > 0 && (
                      <p className="text-sm font-medium mt-1 text-primary">{formatCurrency(price)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
