/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Step1DateType } from "./Step1DateType";
import { Step2Filters } from "./Step2Filters";
import { Step3VenueList } from "./Step3VenueList";
import { Step4VenueDetail } from "./Step4VenueDetail";
import { Step5BookingForm } from "./Step5BookingForm";
import { Step6Confirmation } from "./Step6Confirmation";
import type { EventType, VenueRow, VenueImageRow } from "@/types/database";
import { PRICE_KEY } from "@/types/booking";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

interface Filters {
  city: string;
  neighborhood: string;
  minCapacity: string;
  maxPrice: string;
}

interface BookingWizardProps {
  isAdmin: boolean;
  userId: string;
}

export function BookingWizard({ isAdmin, userId }: BookingWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [date, setDate] = useState<Date | null>(null);
  const [eventType, setEventType] = useState<EventType | null>(null);

  // Step 2 state
  const [filters, setFilters] = useState<Filters>({ city: "", neighborhood: "", minCapacity: "", maxPrice: "" });
  const [loadingVenues, setLoadingVenues] = useState(false);

  // Step 3+ state
  const [venues, setVenues] = useState<VenueWithImages[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueWithImages | null>(null);

  // Step 6 state
  const [confirmedEventId, setConfirmedEventId] = useState<string>("");

  function handleStep1Change(d: Date | null, t: EventType | null) {
    setDate(d);
    setEventType(t);
  }

  function handleFilterChange(field: string, value: string) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  const fetchAvailableVenues = useCallback(async () => {
    if (!date || !eventType) return;
    setLoadingVenues(true);
    const supabase = createClient();
    const dateStr = date.toISOString().split("T")[0];


    let venueQuery = (supabase.from("venues") as any)
      .select("*, images:venue_images(*)")
      .eq("is_active", true)
      .order("name");

    if (filters.city) venueQuery = venueQuery.ilike("city", `%${filters.city}%`);
    if (filters.neighborhood) venueQuery = venueQuery.ilike("neighborhood", `%${filters.neighborhood}%`);
    if (filters.minCapacity) venueQuery = venueQuery.gte("max_capacity", parseInt(filters.minCapacity));

    const nowIso = new Date().toISOString();

    // Fetch venues, booked events, and active locks in parallel

    const [{ data: allVenues }, { data: bookedEvents }, { data: locks }] = await Promise.all([
      venueQuery,
  
      (supabase.from("events") as any)
        .select("venue_id, event_type")
        .eq("date", dateStr)
        .neq("status", "cancelled"),
  
      (supabase.from("booking_locks") as any)
        .select("venue_id, event_type")
        .eq("date", dateStr)
        .gt("locked_until", nowIso)
        .neq("locked_by_user_id", userId),
    ]);

    if (!allVenues) { setLoadingVenues(false); return; }

    const bookedSet = new Set<string>();
    for (const ev of bookedEvents ?? []) {
      bookedSet.add(`${ev.venue_id}:${ev.event_type}`);
      if (ev.event_type === "full_day") {
        bookedSet.add(`${ev.venue_id}:morning`);
        bookedSet.add(`${ev.venue_id}:evening`);
      }
      if (ev.event_type === "morning" || ev.event_type === "evening") {
        bookedSet.add(`${ev.venue_id}:full_day`);
      }
    }

    for (const lock of locks ?? []) {
      bookedSet.add(`${lock.venue_id}:${lock.event_type}`);
      if (lock.event_type === "full_day") {
        bookedSet.add(`${lock.venue_id}:morning`);
        bookedSet.add(`${lock.venue_id}:evening`);
      }
    }

    let available = (allVenues as VenueWithImages[]).filter(
      (v) => !bookedSet.has(`${v.id}:${eventType}`)
    );

    // Apply max price filter
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      available = available.filter((v) => {
        const price = Number(v[PRICE_KEY[eventType]] ?? 0);
        return price <= max;
      });
    }

    setVenues(available);
    setLoadingVenues(false);
  }, [date, eventType, filters, userId]);

  async function handleStep2Next() {
    await fetchAvailableVenues();
    setStep(3);
  }

  function handleVenueSelect(venue: VenueWithImages) {
    setSelectedVenue(venue);
    setStep(4);
  }

  function handleBook() {
    setStep(5);
  }

  function handleBookingSuccess(eventId: string) {
    setConfirmedEventId(eventId);
    setStep(6);
  }

  function handleNewBooking() {
    setStep(1);
    setDate(null);
    setEventType(null);
    setFilters({ city: "", neighborhood: "", minCapacity: "", maxPrice: "" });
    setVenues([]);
    setSelectedVenue(null);
    setConfirmedEventId("");
  }

  const STEP_TITLES: Record<number, string> = {
    1: "בחירת תאריך וסוג אירוע",
    2: "סינון אולמות",
    3: "בחירת אולם",
    4: "פרטי אולם",
    5: "פרטי הזמנה",
    6: "אישור",
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      {step < 6 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold">{STEP_TITLES[step]}</h1>
            <span className="text-sm text-muted-foreground">שלב {step} מתוך 5</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <Step1DateType
          date={date}
          eventType={eventType}
          onChange={handleStep1Change}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && date && eventType && (
        <Step2Filters
          date={date}
          eventType={eventType}
          city={filters.city}
          neighborhood={filters.neighborhood}
          minCapacity={filters.minCapacity}
          maxPrice={filters.maxPrice}
          onChange={handleFilterChange}
          onNext={handleStep2Next}
          onBack={() => setStep(1)}
          loading={loadingVenues}
        />
      )}
      {step === 3 && eventType && (
        <Step3VenueList
          venues={venues}
          eventType={eventType}
          onSelect={handleVenueSelect}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && selectedVenue && eventType && (
        <Step4VenueDetail
          venue={selectedVenue}
          eventType={eventType}
          onBook={handleBook}
          onBack={() => setStep(3)}
        />
      )}
      {step === 5 && selectedVenue && date && eventType && (
        <Step5BookingForm
          venue={selectedVenue}
          date={date}
          eventType={eventType}
          isAdmin={isAdmin}
          userId={userId}
          onBack={() => setStep(4)}
          onSuccess={handleBookingSuccess}
        />
      )}
      {step === 6 && selectedVenue && date && eventType && (
        <Step6Confirmation
          venue={selectedVenue}
          date={date}
          eventType={eventType}
          eventId={confirmedEventId}
          onNewBooking={handleNewBooking}
        />
      )}
    </div>
  );
}
