"use client";

import { HebrewCalendar } from "@/components/ui/hebrew-calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { EventType } from "@/types/database";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/types/booking";

interface Step1Props {
  date: Date | null;
  eventType: EventType | null;
  onChange: (date: Date | null, eventType: EventType | null) => void;
  onNext: () => void;
}

export function Step1DateType({ date, eventType, onChange, onNext }: Step1Props) {
  const canContinue = !!date && !!eventType;

  const isFriday   = (d: Date) => d.getDay() === 5;
  const isSaturday = (d: Date) => d.getDay() === 6;
  const selectedIsFriday   = date ? isFriday(date)   : false;
  const selectedIsSaturday = date ? isSaturday(date) : false;

  const calendarDisabled = (d: Date) => {
    if (d < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    if (eventType === "shabbat") return !isSaturday(d);
    if (eventType === "morning") return false;
    // evening / full_day cannot be on Friday or Saturday
    if (eventType === "evening" || eventType === "full_day") return isFriday(d) || isSaturday(d);
    return false;
  };

  const handleDateSelect = (d: Date | undefined) => {
    const selected = d ?? null;
    if (selected && isSaturday(selected)) {
      onChange(selected, "shabbat");
    } else if (selected && isFriday(selected)) {
      onChange(selected, "morning");
    } else {
      // clear event type if it was locked to shabbat/morning by a previous day selection
      const keep = eventType === "shabbat" || (eventType === "morning" && selectedIsFriday) ? null : eventType;
      onChange(selected, selected ? keep : null);
    }
  };

  const handleEventTypeChange = (type: EventType) => {
    if (selectedIsSaturday && type !== "shabbat") return;
    if (selectedIsFriday   && type !== "morning")  return;
    if (type === "shabbat" && date && !isSaturday(date)) {
      onChange(null, type);
    } else {
      onChange(date, type);
    }
  };

  const isTypeDisabled = (type: EventType) =>
    (selectedIsSaturday && type !== "shabbat") ||
    (selectedIsFriday   && type !== "morning");

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-4">
        <div className="flex gap-4 items-start">
          {/* Calendar */}
          <div className="w-[60%] min-w-0">
            <Label className="text-base font-semibold">בחר תאריך</Label>
            <div className="mt-3 overflow-x-auto">
              <HebrewCalendar
                selected={date ?? undefined}
                onSelect={handleDateSelect}
                disabled={calendarDisabled}
              />
            </div>
          </div>

          {/* Event type */}
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
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background pt-3 pb-1">
        <Button onClick={onNext} disabled={!canContinue} className="w-full">
          המשך לסינון אולמות
        </Button>
      </div>
    </div>
  );
}
