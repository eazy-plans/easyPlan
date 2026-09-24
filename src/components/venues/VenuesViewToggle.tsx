"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapIcon,
  List,
  Building2,
  CheckCircle2,
  Users,
  Clock,
  X,
  Search,
  SlidersHorizontal,
  Banknote,
  ArrowUpDown,
  ParkingCircle,
  Accessibility,
  Bus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { StatChip } from "@/components/ui/stat-chip";
import { VenuesTable } from "./VenuesTable";
import { cn } from "@/lib/utils";
import type { VenueRow, VenueImageRow, UserRow } from "@/types/database";

type VenueWithImages = VenueRow & { images: VenueImageRow[] };

const AMENITY_FILTERS = [
  { key: "hasElevator", label: "מעלית", icon: ArrowUpDown },
  { key: "hasParking", label: "חניה", icon: ParkingCircle },
  { key: "isAccessible", label: "נגיש", icon: Accessibility },
  { key: "hasPublicTransport", label: "תחב״צ", icon: Bus },
] as const;

/** Bordered pill grouping a labeled min/max number-range input pair. */
function RangeField({
  icon: Icon,
  label,
  unit,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  icon: React.ElementType;
  label: string;
  unit?: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3">
      <Icon size={15} className="shrink-0 text-muted-foreground" />
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        min="0"
        placeholder="מ-"
        value={minValue}
        onChange={(e) => onMinChange(e.target.value)}
        className="w-12 bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <span className="text-muted-foreground/50">–</span>
      <input
        type="number"
        min="0"
        placeholder="עד"
        value={maxValue}
        onChange={(e) => onMaxChange(e.target.value)}
        className="w-12 bg-transparent text-center text-sm outline-none placeholder:text-muted-foreground/60"
      />
      {unit && <span className="shrink-0 text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

// Leaflet touches `window` at import time, so the map must never be
// server-rendered - load it client-side only, on first switch to map view.
const VenueMap = dynamic(() => import("./VenueMap").then((m) => m.VenueMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-muted-foreground">טוען מפה...</p>
    </div>
  ),
});

interface VenuesViewToggleProps {
  venues: VenueWithImages[];
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
  isAdmin: boolean;
  isVenueOwner: boolean;
  isSecretary?: boolean;
  /** Extra header controls (e.g. the add-venue button), rendered next to the toggle. */
  actions?: React.ReactNode;
}

export function VenuesViewToggle({
  venues,
  owners,
  isAdmin,
  isVenueOwner,
  isSecretary,
  actions,
}: VenuesViewToggleProps) {
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [capacityMin, setCapacityMin] = useState("");
  const [capacityMax, setCapacityMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [amenities, setAmenities] = useState({
    hasElevator: false,
    hasParking: false,
    isAccessible: false,
    hasPublicTransport: false,
  });

  const stats = useMemo(() => {
    const active = venues.filter((v) => v.is_active).length;
    const pending = venues.filter((v) => v.approval_status === "pending").length;
    const avgCapacity = venues.length
      ? Math.round(venues.reduce((s, v) => s + (v.max_capacity ?? 0), 0) / venues.length)
      : 0;
    return { active, pending, avgCapacity };
  }, [venues]);

  const cities = useMemo(() => [...new Set(venues.map((v) => v.city))].sort(), [venues]);

  const hasActiveFilters = !!search || !!cityFilter ||
    !!capacityMin || !!capacityMax || !!priceMin || !!priceMax ||
    amenities.hasElevator || amenities.hasParking || amenities.isAccessible || amenities.hasPublicTransport;

  const filteredVenues = useMemo(() => {
    const q = search.trim().toLowerCase();
    const capMin = capacityMin ? Number(capacityMin) : null;
    const capMax = capacityMax ? Number(capacityMax) : null;
    const priceMinNum = priceMin ? Number(priceMin) : null;
    const priceMaxNum = priceMax ? Number(priceMax) : null;
    return venues.filter((v) => {
      const matchSearch = !q ||
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        (v.neighborhood ?? "").toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q) ||
        (v.contact_name ?? "").toLowerCase().includes(q) ||
        (v.contact_phone ?? "").includes(q);
      const matchCity = !cityFilter || v.city === cityFilter;
      const matchElevator = !amenities.hasElevator || v.has_elevator;
      const matchParking = !amenities.hasParking || v.has_parking;
      const matchAccessible = !amenities.isAccessible || v.is_accessible;
      const matchTransport = !amenities.hasPublicTransport || v.has_public_transport;
      const matchCapacity = (capMin === null || v.max_capacity >= capMin) && (capMax === null || v.max_capacity <= capMax);
      const prices = [v.price_morning, v.price_evening, v.price_full_day, v.price_shabbat]
        .filter((p): p is number => p != null);
      const matchPrice = (priceMinNum === null && priceMaxNum === null) ||
        prices.some((p) => (priceMinNum === null || p >= priceMinNum) && (priceMaxNum === null || p <= priceMaxNum));
      return matchSearch && matchCity &&
        matchElevator && matchParking && matchAccessible && matchTransport &&
        matchCapacity && matchPrice;
    });
  }, [venues, search, cityFilter, amenities, capacityMin, capacityMax, priceMin, priceMax]);

  function clearFilters() {
    setSearch("");
    setCityFilter("");
    setCapacityMin("");
    setCapacityMax("");
    setPriceMin("");
    setPriceMax("");
    setAmenities({ hasElevator: false, hasParking: false, isAccessible: false, hasPublicTransport: false });
  }

  return (
    <>
      {/* Compact stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="סה״כ אולמות" value={venues.length} icon={Building2} tone="primary" />
        <StatChip label="פעילים" value={stats.active} icon={CheckCircle2} tone="success" />
        <StatChip label="ממתינים לאישור" value={stats.pending} icon={Clock} tone="warning" />
        <StatChip label="קיבולת ממוצעת" value={stats.avgCapacity} icon={Users} tone="violet" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-2"
          >
            <List size={16} />
            טבלה
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("map")}
            className="gap-2"
          >
            <MapIcon size={16} />
            מפה
          </Button>
          {actions}
        </div>
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters ? `${filteredVenues.length} מתוך ${venues.length} אולמות` : `${venues.length} אולמות במערכת`}
        </p>
      </div>

      {/* Search + filters */}
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <SlidersHorizontal size={15} className="text-muted-foreground" />
            סינון וחיפוש
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
              נקה פילטרים
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1">
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9"
            />
          </div>
          <Combobox
            options={cities.map((city) => ({ value: city, label: city }))}
            value={cityFilter}
            onValueChange={setCityFilter}
            placeholder="כל הערים"
            className="w-full sm:w-44"
          />
          <RangeField
            icon={Users}
            label="קיבולת"
            minValue={capacityMin}
            maxValue={capacityMax}
            onMinChange={setCapacityMin}
            onMaxChange={setCapacityMax}
          />
          <RangeField
            icon={Banknote}
            label="מחיר"
            unit="₪"
            minValue={priceMin}
            maxValue={priceMax}
            onMinChange={setPriceMin}
            onMaxChange={setPriceMax}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {AMENITY_FILTERS.map(({ key, label, icon: Icon }) => {
            const active = amenities[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAmenities((a) => ({ ...a, [key]: !a[key] }))}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {viewMode === "table" ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            <VenuesTable venues={filteredVenues} owners={owners} isAdmin={isAdmin} isVenueOwner={isVenueOwner} isSecretary={isSecretary} />
          </div>
        ) : (
          <VenueMap venues={filteredVenues} canEditPins={isAdmin} />
        )}
      </div>
    </>
  );
}
