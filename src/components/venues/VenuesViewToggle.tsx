"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapIcon, List, Building2, CheckCircle2, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatChip } from "@/components/ui/stat-chip";
import { VenuesTable } from "./VenuesTable";
import type { VenueRow, UserRow } from "@/types/database";

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
  venues: VenueRow[];
  owners: Pick<UserRow, "id" | "full_name" | "email">[];
  isAdmin: boolean;
  isVenueOwner: boolean;
  /** Extra header controls (e.g. the add-venue button), rendered next to the toggle. */
  actions?: React.ReactNode;
}

export function VenuesViewToggle({
  venues,
  owners,
  isAdmin,
  isVenueOwner,
  actions,
}: VenuesViewToggleProps) {
  const [viewMode, setViewMode] = useState<"table" | "map">("table");

  const stats = useMemo(() => {
    const active = venues.filter((v) => v.is_active).length;
    const pending = venues.filter((v) => v.approval_status === "pending").length;
    const avgCapacity = venues.length
      ? Math.round(venues.reduce((s, v) => s + (v.max_capacity ?? 0), 0) / venues.length)
      : 0;
    return { active, pending, avgCapacity };
  }, [venues]);

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
        <p className="text-sm text-muted-foreground">{venues.length} אולמות במערכת</p>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {viewMode === "table" ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            <VenuesTable venues={venues} owners={owners} isAdmin={isAdmin} isVenueOwner={isVenueOwner} />
          </div>
        ) : (
          <VenueMap venues={venues} canEditPins={isAdmin} />
        )}
      </div>
    </>
  );
}
