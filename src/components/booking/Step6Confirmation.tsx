"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { EVENT_TYPE_LABELS } from "@/types/booking";
import type { EventType, VenueRow } from "@/types/database";

interface Step6Props {
  venue: VenueRow;
  date: Date;
  eventType: EventType;
  eventId: string;
  onNewBooking: () => void;
}

export function Step6Confirmation({ venue, date, eventType, eventId, onNewBooking }: Step6Props) {
  return (
    <div className="max-w-2xl w-full flex flex-col min-h-full">
      <div className="flex-1 flex flex-col items-center text-center gap-6 py-6">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 size={56} className="text-success" strokeWidth={1.5} />
          <h2 className="text-xl font-bold">האירוע אושר בהצלחה!</h2>
          <p className="text-sm text-muted-foreground">האירוע נרשם במערכת ומאושר</p>
        </div>

        <div className="bg-muted rounded-lg p-4 text-sm space-y-2 w-full text-right">
          <div className="flex gap-2 justify-between">
            <span className="text-muted-foreground">אולם:</span>
            <span className="font-medium">{venue.name}</span>
          </div>
          <div className="flex flex-col gap-0.5 items-end">
            <span className="text-muted-foreground">תאריך:</span>
            <span className="font-medium">{formatDate(date)}</span>
            <span className="text-xs text-muted-foreground">{toHebrewDateShort(date)}</span>
          </div>
          <div className="flex gap-2 justify-between">
            <span className="text-muted-foreground">סוג:</span>
            <span className="font-medium">{EVENT_TYPE_LABELS[eventType]}</span>
          </div>
          <div className="flex gap-2 justify-between">
            <span className="text-muted-foreground">מספר אירוע:</span>
            <span className="font-mono text-xs">{eventId.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          תוכל לעקוב אחר האירוע בדף האירועים.
        </p>
      </div>

      <div className="sticky bottom-0 bg-background pt-3 pb-1">
        <Button onClick={onNewBooking} className="w-full">הזמן אירוע נוסף</Button>
      </div>
    </div>
  );
}
