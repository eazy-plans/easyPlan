"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { HebrewCalendar } from "@/components/ui/hebrew-calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { toLocalDateStr } from "@/lib/utils";
import type { EventType, VenueRow, VenueImageRow } from "@/types/database";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/types/booking";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

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

  const fetchAvailability = useCallback(async () => {
    setLoadingAvailability(true);
    const supabase = createClient();
    const today = toLocalDateStr(new Date());
    const end = new Date();
    end.setMonth(end.getMonth() + 6);
    const endDate = toLocalDateStr(end);
    const nowIso = new Date().toISOString();

    const [{ data: bookedEvents }, { data: locks }] = await Promise.all([
      supabase.from("events")
        .select("date, event_type")
        .eq("venue_id", venue.id)
        .gte("date", today)
        .lte("date", endDate)
        .neq("status", "cancelled"),
      supabase.from("booking_locks")
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

  // Actually booked (event or hold) - shown in red, unlike past/rule-blocked
  // days which stay gray
  const isBooked = (d: Date) =>
    !!eventType && d >= today && blockedSet.has(`${toLocalDateStr(d)}:${eventType}`);

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

        <div>
          <Label className="text-base font-semibold">סוג האירוע</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => handleEventTypeChange(type)}
                disabled={isTypeDisabled(type)}
                className="border-2 rounded-lg py-2.5 px-2 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
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
        </div>

        <div>
          <Label className="text-base font-semibold">בחר תאריך פנוי</Label>
          {loadingAvailability ? (
            <p className="text-sm text-muted-foreground mt-4">טוען זמינות...</p>
          ) : (
            <div className="mt-3">
              <HebrewCalendar
                compact
                selected={date ?? undefined}
                onSelect={handleDateSelect}
                disabled={calendarDisabled}
                dayClassName={(d) => (isBooked(d) ? "bg-red-100 opacity-100" : undefined)}
                renderDay={(d) =>
                  isBooked(d) ? (
                    <span className="inline-block rounded bg-red-200/70 px-1 text-[10px] font-semibold text-red-800">תפוס</span>
                  ) : null
                }
                className="w-full"
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border border-red-200 bg-red-100" /> תפוס
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border border-gray-200 bg-gray-100" /> לא זמין
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border border-amber-200 bg-amber-100" /> היום
                </span>
              </div>
            </div>
          )}
          {date && (
            <div className="mt-3 p-2 bg-muted rounded text-sm text-right flex items-center gap-2">
              <span className="text-muted-foreground">התאריך שנבחר:</span>
              <span className="font-medium">{date.toLocaleDateString("he-IL")}</span>
              <span className="text-xs text-muted-foreground">({toHebrewDateShort(date)})</span>
            </div>
          )}
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
