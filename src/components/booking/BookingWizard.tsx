/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { StepSearch } from "./StepSearch";
import { StepPickDate } from "./StepPickDate";
import { Step4VenueDetail } from "./Step4VenueDetail";
import { Step5BookingForm } from "./Step5BookingForm";
import { Step6Confirmation } from "./Step6Confirmation";
import type { EventType, VenueRow, VenueImageRow } from "@/types/database";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

type Screen = "search" | "pick-date" | "venue-detail" | "booking" | "confirm";

const STEPS: { screen: Screen; title: string }[] = [
  { screen: "search",       title: "חיפוש אולם"    },
  { screen: "pick-date",    title: "בחירת תאריך"   },
  { screen: "venue-detail", title: "פרטי אולם"      },
  { screen: "booking",      title: "פרטי הזמנה"    },
];

interface BookingWizardProps {
  isAdmin: boolean;
  userId: string;
}

export function BookingWizard({ isAdmin, userId }: BookingWizardProps) {
  const [screen, setScreen]               = useState<Screen>("search");
  const [selectedVenue, setSelectedVenue] = useState<VenueWithImages | null>(null);
  const [date, setDate]                   = useState<Date | null>(null);
  const [eventType, setEventType]         = useState<EventType | null>(null);
  const [confirmedEventId, setConfirmedEventId] = useState("");

  function reset() {
    setScreen("search");
    setSelectedVenue(null);
    setDate(null);
    setEventType(null);
    setConfirmedEventId("");
  }

  function handleVenueSelect(venue: VenueWithImages, d: Date | null, et: EventType | null) {
    setSelectedVenue(venue);
    setDate(d);
    setEventType(et);
    // Skip pick-date if the user already chose both date and event type in the search
    setScreen(d && et ? "venue-detail" : "pick-date");
  }

  // Progress bar: skip pick-date step if it was skipped
  const visibleSteps = STEPS.filter(
    (s) => s.screen !== "pick-date" || screen === "pick-date" || (!date || !eventType)
  );
  const currentIndex = STEPS.findIndex((s) => s.screen === screen);
  const showProgress = screen !== "confirm";

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col flex-1 min-h-0">
      {showProgress && currentIndex >= 0 && (
        <div className="mb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold">{STEPS[currentIndex].title}</h1>
            <span className="text-sm text-muted-foreground">שלב {currentIndex + 1} מתוך {STEPS.length}</span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= currentIndex ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">

        {screen === "search" && (
          <StepSearch userId={userId} onSelect={handleVenueSelect} />
        )}

        {screen === "pick-date" && selectedVenue && (
          <StepPickDate
            venue={selectedVenue}
            userId={userId}
            onNext={(d, et) => { setDate(d); setEventType(et); setScreen("venue-detail"); }}
            onBack={() => setScreen("search")}
          />
        )}

        {screen === "venue-detail" && selectedVenue && eventType && (
          <Step4VenueDetail
            venue={selectedVenue}
            eventType={eventType}
            onBook={() => setScreen("booking")}
            onBack={() => setScreen(date ? "search" : "pick-date")}
          />
        )}

        {screen === "booking" && selectedVenue && date && eventType && (
          <Step5BookingForm
            venue={selectedVenue}
            date={date}
            eventType={eventType}
            isAdmin={isAdmin}
            userId={userId}
            onBack={() => setScreen("venue-detail")}
            onSuccess={(id) => { setConfirmedEventId(id); setScreen("confirm"); }}
          />
        )}

        {screen === "confirm" && selectedVenue && date && eventType && (
          <Step6Confirmation
            venue={selectedVenue}
            date={date}
            eventType={eventType}
            eventId={confirmedEventId}
            onNewBooking={reset}
          />
        )}
      </div>
    </div>
  );
}
