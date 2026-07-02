/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HebrewCalendar } from "@/components/ui/hebrew-calendar";
import { Building2, Search, CalendarDays, X, ChevronDown, Clock, Sliders, Users, DollarSign, Accessibility, ParkingCircle, Zap, Bus } from "lucide-react";
import Image from "next/image";
import { formatDate, formatCurrency, toLocalDateStr } from "@/lib/utils";
import type { EventType, VenueRow, VenueImageRow } from "@/types/database";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, PRICE_KEY } from "@/types/booking";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
function getImageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/venue-images/${path}`;
}

interface StepSearchProps {
  userId: string;
  onSelect: (venue: VenueWithImages, date: Date | null, eventType: EventType | null) => void;
}

export function StepSearch({ userId, onSelect }: StepSearchProps) {
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [selectedCity, setSelectedCity]   = useState("");
  const [eventType, setEventType]         = useState<EventType | null>(null);
  const [date, setDate]                   = useState<Date | null>(null);

  const [allVenues, setAllVenues]         = useState<VenueWithImages[]>([]);
  const [bookedSet, setBookedSet]         = useState<Set<string>>(new Set());
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingAvail, setLoadingAvail]   = useState(false);
  const [activeLocks, setActiveLocks]     = useState<{ venue_id: string; date: string; event_type: EventType; locked_until: string }[]>([]);
  const [showHolds, setShowHolds]         = useState(false);

  // Hall parameter filters
  const [minCapacity, setMinCapacity]     = useState("");
  const [maxPrice, setMaxPrice]           = useState("");
  const [showFilters, setShowFilters]     = useState(false);
  const [amenities, setAmenities]         = useState({
    hasElevator: false,
    hasParking: false,
    isAccessible: false,
    hasPublicTransport: false,
  });

  useEffect(() => {
    const supabase = createClient();
    (supabase.from("venues") as any)
      .select("*, images:venue_images(*)")
      .eq("is_active", true)
      .order("name")
      .then(({ data }: any) => { setAllVenues(data ?? []); setLoadingVenues(false); });
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

  function selectVenue(v: VenueWithImages) {
    setSelectedVenueId(v.id);
  }

  function clearVenue() {
    setSelectedVenueId("");
  }

  const filtered = allVenues.filter((v) => {
    if (selectedVenueId && v.id !== selectedVenueId) return false;
    if (selectedCity && v.city !== selectedCity) return false;
    if (date && eventType && bookedSet.has(`${v.id}:${eventType}`)) return false;

    // Hall parameter filters
    if (minCapacity && v.max_capacity < parseInt(minCapacity)) return false;

    if (maxPrice && eventType) {
      const venuePrice = v[PRICE_KEY[eventType]];
      if (typeof venuePrice === "number" && venuePrice > parseInt(maxPrice)) return false;
    }

    if (amenities.hasElevator && !v.has_elevator) return false;
    if (amenities.hasParking && !v.has_parking) return false;
    if (amenities.isAccessible && !v.is_accessible) return false;
    if (amenities.hasPublicTransport && !v.has_public_transport) return false;

    return true;
  });

  const filteredWithoutDate = allVenues.filter((v) => {
    if (selectedVenueId && v.id !== selectedVenueId) return false;
    if (selectedCity && v.city !== selectedCity) return false;

    // Hall parameter filters
    if (minCapacity && v.max_capacity < parseInt(minCapacity)) return false;

    if (maxPrice && eventType) {
      const venuePrice = v[PRICE_KEY[eventType]];
      if (typeof venuePrice === "number" && venuePrice > parseInt(maxPrice)) return false;
    }

    if (amenities.hasElevator && !v.has_elevator) return false;
    if (amenities.hasParking && !v.has_parking) return false;
    if (amenities.isAccessible && !v.is_accessible) return false;
    if (amenities.hasPublicTransport && !v.has_public_transport) return false;

    return true;
  });

  const hasDateFilter = !!date && !!eventType;
  const anyAmenityFilter = amenities.hasElevator || amenities.hasParking || amenities.isAccessible || amenities.hasPublicTransport;
  const anyFilter = !!selectedVenueId || !!selectedCity || !!eventType || !!date || !!minCapacity || !!maxPrice || anyAmenityFilter;
  const allTakenOnDate = hasDateFilter && filtered.length === 0 && filteredWithoutDate.length > 0;

  const clearAllFilters = () => {
    clearVenue();
    setSelectedCity("");
    setEventType(null);
    setDate(null);
    setBookedSet(new Set());
    setMinCapacity("");
    setMaxPrice("");
    setShowFilters(false);
    setAmenities({
      hasElevator: false,
      hasParking: false,
      isAccessible: false,
      hasPublicTransport: false,
    });
  };

  const hasActiveFilters = !!minCapacity || !!maxPrice || anyAmenityFilter;
  const activeFilterCount = [
    minCapacity ? 1 : 0,
    maxPrice ? 1 : 0,
    amenities.hasElevator ? 1 : 0,
    amenities.hasParking ? 1 : 0,
    amenities.isAccessible ? 1 : 0,
    amenities.hasPublicTransport ? 1 : 0,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col min-h-full gap-4" dir="rtl">

      {/* Venue and City Selection */}
      <div className="space-y-3 bg-card rounded-lg p-4 border border-border" dir="rtl">

        <div className="grid grid-cols-2 gap-3" dir="rtl">
          {/* Venue Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="venue-select" className="text-xs font-semibold text-muted-foreground text-right block">
              שם אולם
            </Label>
            <Select dir="rtl" value={selectedVenueId || "all"} onValueChange={(value) => {
              if (value === "all") {
                clearVenue();
              } else {
                const venue = allVenues.find((v) => v.id === value);
                if (venue) selectVenue(venue);
              }
            }}>
              <SelectTrigger id="venue-select" className="w-full text-right">
                <SelectValue placeholder="כל האולמות" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">כל האולמות</SelectItem>
                {!loadingVenues && allVenues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="city-select" className="text-xs font-semibold text-muted-foreground text-right block">
              עיר
            </Label>
            <Select dir="rtl" value={selectedCity || "all"} onValueChange={(value) => {
              setSelectedCity(value === "all" ? "" : value);
            }}>
              <SelectTrigger id="city-select" className="w-full text-right">
                <SelectValue placeholder="כל הערים" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">כל הערים</SelectItem>
                {!loadingVenues && uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Event type selection */}
      <div className="space-y-3 bg-card rounded-lg p-4 border border-border" dir="rtl">
        <h2 className="text-sm font-semibold text-right">סוג האירוע</h2>
        <div className="grid grid-cols-2 gap-2 auto-cols-fr" dir="rtl">
          {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => handleEventType(type)}
              className={`px-4 py-3 rounded-lg font-medium text-sm transition-all border-2 ${
                eventType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-transparent bg-muted/50 text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hall parameters filters - Collapsible panel */}
      <div className="space-y-3 border-t pt-4">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`w-full flex flex-row-reverse items-center justify-between px-4 py-3 rounded-lg transition-all ${
            showFilters
              ? "bg-primary/10 border border-primary/30"
              : "bg-muted/50 border border-transparent hover:bg-muted"
          }`}
        >
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform ${
              showFilters ? "rotate-180" : ""
            }`}
          />
          <div className="flex flex-row-reverse items-center justify-end gap-2 flex-1" dir="rtl">
            <span className="font-semibold text-sm">סינון מתקדם</span>
            {hasActiveFilters && (
              <Badge variant="default" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
            <Sliders size={18} className="text-primary" />
          </div>
        </button>

        {showFilters && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border" dir="rtl">
            {/* Capacity and Price */}
            <div className="grid grid-cols-2 gap-3" dir="rtl">
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="minCapacity" className="text-xs font-semibold flex flex-row-reverse items-center justify-end gap-2 text-muted-foreground text-right" >
                  קיבולת
                  <Users size={14} />
                </Label>
                <Input
                  id="minCapacity"
                  type="number"
                  min="0"
                  placeholder="מינימום"
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                  className="text-sm"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="maxPrice" className="text-xs font-semibold flex flex-row-reverse items-center justify-end gap-2 text-muted-foreground text-right">
                  תקציב
                  <DollarSign size={14} />
                </Label>
                <Input
                  id="maxPrice"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="מקסימום"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="text-sm"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-3 border-t pt-3" dir="rtl">
              <p className="text-xs font-semibold text-muted-foreground text-right">גישה</p>
              <div className="grid grid-cols-2 gap-2" dir="rtl">
                <label className="flex flex-row-reverse items-center justify-end gap-3 p-2.5 rounded-md hover:bg-background/50 cursor-pointer transition-colors" dir="rtl">
                  <span className="flex flex-row-reverse items-center justify-end gap-2 text-sm flex-1">
                    מעלית
                    <Zap size={14} className="text-amber-500" />
                  </span>
                  <Checkbox
                    id="hasElevator"
                    checked={amenities.hasElevator}
                    onChange={(e) =>
                      setAmenities((prev) => ({ ...prev, hasElevator: e.target.checked }))
                    }
                  />
                </label>
                <label className="flex flex-row-reverse items-center justify-end gap-3 p-2.5 rounded-md hover:bg-background/50 cursor-pointer transition-colors" dir="rtl">
                  <span className="flex flex-row-reverse items-center justify-end gap-2 text-sm flex-1">
                    חניה
                    <ParkingCircle size={14} className="text-blue-500" />
                  </span>
                  <Checkbox
                    id="hasParking"
                    checked={amenities.hasParking}
                    onChange={(e) =>
                      setAmenities((prev) => ({ ...prev, hasParking: e.target.checked }))
                    }
                  />
                </label>
                <label className="flex flex-row-reverse items-center justify-end gap-3 p-2.5 rounded-md hover:bg-background/50 cursor-pointer transition-colors">
                  <span className="flex flex-row-reverse items-center justify-end gap-2 text-sm flex-1">
                    נגיש לנכים
                    <Accessibility size={14} className="text-green-500" />
                  </span>
                  <Checkbox
                    id="isAccessible"
                    checked={amenities.isAccessible}
                    onChange={(e) =>
                      setAmenities((prev) => ({ ...prev, isAccessible: e.target.checked }))
                    }
                  />
                </label>
                <label className="flex flex-row-reverse items-center justify-end gap-3 p-2.5 rounded-md hover:bg-background/50 cursor-pointer transition-colors">
                  <span className="flex flex-row-reverse items-center justify-end gap-2 text-sm flex-1">
                    תחבורה
                    <Bus size={14} className="text-purple-500" />
                  </span>
                  <Checkbox
                    id="hasPublicTransport"
                    checked={amenities.hasPublicTransport}
                    onChange={(e) =>
                      setAmenities((prev) => ({ ...prev, hasPublicTransport: e.target.checked }))
                    }
                  />
                </label>
              </div>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setMinCapacity("");
                  setMaxPrice("");
                  setAmenities({
                    hasElevator: false,
                    hasParking: false,
                    isAccessible: false,
                    hasPublicTransport: false,
                  });
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                נקה פילטרים
              </button>
            )}
          </div>
        )}
      </div>

      {/* Date picker */}
      <div className="space-y-3 bg-card rounded-lg p-4 border border-border" dir="rtl">
          <CalendarDays size={16} className="text-primary" />
        <div className="flex flex-row-reverse items-center justify-end gap-3 flex-wrap-reverse">
          {anyFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs px-3 py-1 text-foreground bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
            >
              נקה הכל
            </button>
          )}
          {date && (
            <button
              type="button"
              onClick={() => { setDate(null); setBookedSet(new Set()); }}
              className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex flex-row-reverse items-center justify-end gap-1"
            >
              נקה
              <X size={14} />
            </button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                {date ? formatDate(date) : "בחר תאריך"}
                <CalendarDays size={16} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <HebrewCalendar
                selected={date ?? undefined}
                onSelect={handleDateSelect}
                disabled={calDisabled}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Results */}
      <p className="text-sm text-muted-foreground text-right">
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
            className="w-full flex flex-row-reverse items-center justify-between px-3 py-2 text-sm bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${showHolds ? "rotate-180" : ""}`} />
            <span className="flex flex-row-reverse items-center justify-end gap-2">
              {activeLocks.length} {activeLocks.length === 1 ? "אולם" : "אולמות"} בהמתנה כרגע
              <Clock size={14} />
            </span>
          </button>
          {showHolds && (
            <div className="divide-y divide-amber-100">
              {activeLocks.map((lock, i) => {
                const venueName = allVenues.find((v) => v.id === lock.venue_id)?.name ?? "אולם לא ידוע";
                const minsLeft = Math.max(0, Math.round((new Date(lock.locked_until).getTime() - Date.now()) / 60000));
                return (
                  <div key={i} className="px-3 py-2 text-sm flex flex-row-reverse items-center justify-between bg-amber-50/50">
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 shrink-0">
                      {minsLeft} דק&apos;
                    </Badge>
                    <div className="flex flex-row-reverse items-center justify-end gap-2 min-w-0 flex-1">
                      <span className="text-muted-foreground text-xs shrink-0 text-right">
                        {formatDate(new Date(lock.date + "T12:00:00"))} · {EVENT_TYPE_LABELS[lock.event_type]}
                      </span>
                      <span className="font-medium truncate text-right">{venueName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loadingVenues && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground gap-2 text-right">
            <Building2 size={40} strokeWidth={1} />
            {allTakenOnDate ? (
              <>
                <p className="font-medium text-foreground">התאריך תפוס</p>
                <p className="text-sm text-right">כל האולמות תפוסים בתאריך זה לסוג האירוע שנבחר</p>
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
                  className="border rounded-lg p-4 flex flex-row-reverse gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
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
                    <div className="flex flex-row-reverse items-start justify-between gap-2">
                      <Badge variant="outline" className="shrink-0">{venue.max_capacity} אורחים</Badge>
                      <h3 className="font-semibold truncate text-right">{venue.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 text-right">
                      {venue.city}{venue.neighborhood ? ` · ${venue.neighborhood}` : ""}
                    </p>
                    {price !== null && price > 0 && (
                      <p className="text-sm font-medium mt-1 text-primary text-right">{formatCurrency(price)}</p>
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
