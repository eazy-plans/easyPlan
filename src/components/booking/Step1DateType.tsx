"use client";

import { he } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
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

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-4">
        <div className="flex gap-4 items-start">
          {/* Calendar */}
          <div className="w-[60%] min-w-0">
            <Label className="text-base font-semibold">בחר תאריך</Label>
            <Calendar
              mode="single"
              selected={date ?? undefined}
              onSelect={(d) => onChange(d ?? null, eventType)}
              locale={he}
              weekStartsOn={0}
              disabled={{ before: new Date() }}
              className="border rounded-lg p-3 w-full mt-2"
            />
          </div>

          {/* Event type */}
          <div className="w-[40%] min-w-0">
            <Label className="text-base font-semibold">סוג האירוע</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange(date, type)}
                  className="border-2 rounded-lg py-6 px-3 text-base font-medium transition-all hover:opacity-80"
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
