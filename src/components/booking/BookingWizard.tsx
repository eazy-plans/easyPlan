"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
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
  venues: VenueWithImages[];
}

export function BookingWizard({ isAdmin, userId, venues }: BookingWizardProps) {
  const [screen, setScreen]               = useState<Screen>("search");
  const [selectedVenue, setSelectedVenue] = useState<VenueWithImages | null>(null);
  const [date, setDate]                   = useState<Date | null>(null);
  const [eventType, setEventType]         = useState<EventType | null>(null);
  const [confirmedEventId, setConfirmedEventId] = useState("");
  // Whether this booking flow goes through the pick-date screen. Drives the
  // progress bar so it doesn't claim 4 steps for a 3-step flow.
  const [usedPickDate, setUsedPickDate]   = useState(true);

  function reset() {
    setScreen("search");
    setSelectedVenue(null);
    setDate(null);
    setEventType(null);
    setConfirmedEventId("");
    setUsedPickDate(true);
  }

  function handleVenueSelect(venue: VenueWithImages, d: Date | null, et: EventType | null) {
    setSelectedVenue(venue);
    setDate(d);
    setEventType(et);
    // Skip pick-date if the user already chose both date and event type in the search
    setUsedPickDate(!(d && et));
    setScreen(d && et ? "venue-detail" : "pick-date");
  }

  const visibleSteps = usedPickDate ? STEPS : STEPS.filter((s) => s.screen !== "pick-date");
  const currentIndex = visibleSteps.findIndex((s) => s.screen === screen);
  const showProgress = screen !== "confirm";

  // The confirmation card is a short success message and reads best as a
  // narrow centered column. Every other step (including the booking form,
  // which lays out its static summary/pricing and its actual fields as two
  // columns internally) has real width to fill, so only "confirm" gets the
  // narrow wrapper.
  const narrowStep = screen === "confirm";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {showProgress && currentIndex >= 0 && (
        <div className={cn("mb-4 shrink-0 w-full", narrowStep && "max-w-2xl")}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold">{visibleSteps[currentIndex].title}</h1>
            <span className="text-sm text-muted-foreground">שלב {currentIndex + 1} מתוך {visibleSteps.length}</span>
          </div>
          <div className="flex gap-1">
            {visibleSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= currentIndex ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex-1 overflow-x-hidden min-h-0 w-full",
          // The search step manages its own internal split scroll (filters
          // fixed, results list scrolls) - it needs a bounded height to do
          // that, so it gets overflow-hidden here instead of owning the scroll.
          screen === "search" ? "overflow-hidden" : "overflow-y-auto scroll-area"
          // Deliberately NOT narrowed here even for narrowStep screens: this div
          // is the scroll container, so its scrollbar sits at its own edge (in
          // RTL that's the box's left edge). Narrowing it left the scrollbar
          // floating in the middle of the page. The width cap for narrow steps
          // now lives inside Step5BookingForm/Step6Confirmation instead, so the
          // scrollbar stays pinned to the real edge of the screen while the
          // visible content stays a narrow flush-right column.
        )}
      >

        {screen === "search" && (
          <StepSearch userId={userId} venues={venues} onSelect={handleVenueSelect} />
        )}

        {screen === "pick-date" && selectedVenue && (
          <StepPickDate
            venue={selectedVenue}
            userId={userId}
            initialDate={date}
            initialEventType={eventType}
            onNext={(d, et) => { setDate(d); setEventType(et); setScreen("venue-detail"); }}
            onBack={() => setScreen("search")}
          />
        )}

        {screen === "venue-detail" && selectedVenue && eventType && (
          <Step4VenueDetail
            venue={selectedVenue}
            eventType={eventType}
            onBook={() => setScreen("booking")}
            // date is always set by this screen, so it can't decide where
            // "back" leads - usedPickDate tracks whether this flow actually
            // went through pick-date, keeping back navigation step-by-step.
            onBack={() => setScreen(usedPickDate ? "pick-date" : "search")}
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
