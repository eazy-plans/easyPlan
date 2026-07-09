"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapIcon, List } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <>
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

      <div className="flex-1 overflow-hidden min-h-0">
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
