"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VenueForm } from "./VenueForm";
import { VenueEventsPanel } from "./VenueEventsPanel";
import { VenueStatsPanel } from "./VenueStatsPanel";
import type { VenueRow, UserRow, VenueImageRow, EventRow } from "@/types/database";

type Tab = "events" | "stats" | "edit";

interface Props {
  venue: VenueRow;
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
  images: VenueImageRow[];
  events: EventRow[];
  /** All-time non-cancelled event count - events only covers the recent history window. */
  allTimeCount: number;
  userId: string;
  isAdmin: boolean;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "events", label: "אירועים" },
  { id: "stats",  label: "סטטיסטיקות" },
  { id: "edit",   label: "עריכה" },
];

export function VenueDetailTabs({ venue, owners, images, events, allTimeCount, userId, isAdmin }: Props) {
  const [tab, setTab] = useState<Tab>("events");

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="shrink-0 bg-background border-b">
        {/* Back + title row */}
        <div className="flex items-center gap-3 pt-4 pb-3">
          <Link
            href="/venues"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors shrink-0"
            title="חזרה לאולמות"
          >
            <ArrowRight size={16} className="text-muted-foreground" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight truncate">{venue.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
              {venue.address ? ` · ${venue.address}` : ""}
            </p>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto py-5 pb-10">
        {tab === "events" && (
          <VenueEventsPanel
            venueId={venue.id}
            initialEvents={events}
            userId={userId}
            isAdmin={isAdmin}
          />
        )}

        {tab === "stats" && (
          <VenueStatsPanel events={events} allTimeCount={allTimeCount} />
        )}

        {tab === "edit" && (
          <VenueForm venue={venue} owners={owners} initialImages={images} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}
