"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { he } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { HebrewCalendar } from "@/components/ui/hebrew-calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import type { EventType, VenueRow, VenueImageRow } from "@/types/database";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/types/booking";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

const toLocalDateStr = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);

interface StepPickDateProps {
  venue: VenueWithImages;
  userId: string;
  onNext: (date: Date, eventType: EventType) => void;
  onBack: () => void;
}

export function StepPickDate({ venue, userId, onNext, onBack }: StepPickDateProps) {
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [useHebrewCalendar, setUseHebrewCalendar] = useState(false);

  const fetchAvailability = useCallback(async () => {
    setLoadingAvailability(true);
    const supabase = createClient();
    const today = toLocalDateStr(new Date());
    const end = new Date();
    end.setMonth(end.getMonth() + 6);
    const endDate = toLocalDateStr(end);
    const nowIso = new Date().toISOString();

    const [{ data: bookedEvents }, { data: locks }] = await Promise.all([
      (supabase.from("events") as any)
        .select("date, event_type")
        .eq("venue_id", venue.id)
        .gte("date", today)
        .lte("date", endDate)
        .neq("status", "cancelled"),
      (supabase.from("booking_locks") as any)
        .select("date, event_type")
        .eq("venue_id", venue.id)
        .gte("date", today)
        .gt("locked_until", nowIso)
        .neq("locked_by_user_id", userId),
    ]);

    const blocked = new Set<string>();
    for (const ev of [...(bookedEvents ?? []), ...(locks ?? [])]) {
      blocked.add(`${ev.date}:${ev.event_type}`);
      if (ev.event_type === "full_day") {
        blocked.add(`${ev.date}:morning`);
        blocked.add(`${ev.date}:evening`);
      }
      if (ev.event_type === "morning" || ev.event_type === "evening") {
        blocked.add(`${ev.date}:full_day`);
      }
      if (ev.event_type === "shabbat") {
        const [y, m, d] = ev.date.split("-").map(Number);
        const fri = new Date(y, m - 1, d);
        fri.setDate(fri.getDate() - 1);
        blocked.add(`${toLocalDateStr(fri)}:evening`);
      }
      if (ev.event_type === "evening") {
        const [y, m, d] = ev.date.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        if (dt.getDay() === 5) {
          dt.setDate(dt.getDate() + 1);
          blocked.add(`${toLocalDateStr(dt)}:shabbat`);
        }
      }
    }

    setBlockedSet(blocked);
    setLoadingAvailability(false);
  }, [venue.id, userId]);

  useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

  const isFriday   = (d: Date) => d.getDay() === 5;
  const isSaturday = (d: Date) => d.getDay() === 6;
  const today      = new Date(new Date().setHours(0, 0, 0, 0));

  const calendarDisabled = (d: Date) => {
    if (d < today) return true;
    if (!eventType) return false;
    if (eventType === "shabbat" && !isSaturday(d)) return true;
    if ((eventType === "evening" || eventType === "full_day") && (isFriday(d) || isSaturday(d))) return true;
    return blockedSet.has(`${toLocalDateStr(d)}:${eventType}`);
  };

  const isTypeDisabled = (type: EventType) => {
    if (!date) return false;
    if (isSaturday(date) && type !== "shabbat") return true;
    if (isFriday(date)   && type !== "morning")  return true;
    return false;
  };

  const handleEventTypeChange = (type: EventType) => {
    if (isTypeDisabled(type)) return;
    if (eventType === type) {
      setEventType(null);
      return;
    }
    if (type === "shabbat" && date && !isSaturday(date)) {
      setDate(null);
    } else if ((type === "evening" || type === "full_day") && date && (isFriday(date) || isSaturday(date))) {
      setDate(null);
    }
    setEventType(type);
  };

  const handleDateSelect = (d: Date | undefined) => {
    const selected = d ?? null;
    if (!selected) { setDate(null); return; }
    if (isSaturday(selected)) {
      setEventType("shabbat");
    } else if (isFriday(selected) && (eventType === "evening" || eventType === "full_day")) {
      setEventType(null);
    } else if (!isFriday(selected) && !isSaturday(selected) && eventType === "shabbat") {
      setEventType(null);
    }
    setDate(selected);
  };

  const canContinue = !!date && !!eventType;

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-4">
        <div className="bg-muted rounded-lg p-3 text-sm">
          <span className="text-muted-foreground">אולם: </span>
          <span className="font-medium">{venue.name}</span>
          <span className="text-muted-foreground"> · </span>
          <span className="font-medium">{venue.city}</span>
          <span className="text-muted-foreground"> · </span>
          <span className="font-medium">{venue.max_capacity} אורחים</span>
        </div>

        <div className="flex gap-4 items-start">
          <div className="w-[60%] min-w-0">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">בחר תאריך פנוי</Label>
              <button
                type="button"
                onClick={() => setUseHebrewCalendar(!useHebrewCalendar)}
                className="text-xs px-2 py-1 border rounded hover:bg-muted transition-colors"
              >
                {useHebrewCalendar ? "לוח שנה גרגוריאני" : "לוח שנה עברי"}
              </button>
            </div>
            {loadingAvailability ? (
              <p className="text-sm text-muted-foreground mt-4">טוען זמינות...</p>
            ) : useHebrewCalendar ? (
              <HebrewCalendar
                mode="single"
                selected={date ?? undefined}
                onSelect={handleDateSelect}
                disabled={calendarDisabled}
                className="border rounded-lg p-3 w-full"
              />
            ) : (
              <Calendar
                mode="single"
                selected={date ?? undefined}
                onSelect={handleDateSelect}
                locale={he}
                weekStartsOn={0}
                disabled={calendarDisabled}
                className="border rounded-lg p-3 w-full"
              />
            )}
          </div>

          <div className="w-[40%] min-w-0">
            <Label className="text-base font-semibold">סוג האירוע</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleEventTypeChange(type)}
                  disabled={isTypeDisabled(type)}
                  className="border-2 rounded-lg py-6 px-3 text-base font-medium transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    borderColor: EVENT_TYPE_COLORS[type],
                    backgroundColor: eventType === type ? EVENT_TYPE_COLORS[type] : undefined,
                    color: eventType === type ? "#fff" : undefined,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {date && (
              <div className="mt-4 p-2 bg-muted rounded text-sm text-right">
                <div className="text-muted-foreground">התאריך שנבחר:</div>
                <div className="font-medium">{date.toLocaleDateString("he-IL")}</div>
                <div className="text-xs text-muted-foreground">{toHebrewDateShort(date)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background pt-3 pb-1">
        <div className="flex gap-3">
          <Button
            onClick={() => canContinue && onNext(date!, eventType!)}
            disabled={!canContinue}
            className="flex-1"
          >
            המשך לפרטי האולם
          </Button>
          <Button variant="outline" onClick={onBack}>חזור</Button>
        </div>
      </div>
    </div>
  );
}
