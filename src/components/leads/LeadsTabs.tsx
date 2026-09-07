"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadsManager } from "./LeadsManager";
import { LeadsTimeline, type TimelineEntry } from "./LeadsTimeline";
import type { LeadStatus } from "@/types/database";

type LeadRow = {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

interface LeadsTabsProps {
  leads: LeadRow[];
  initialSearch?: string;
  timelineEntries: TimelineEntry[];
}

export function LeadsTabs({ leads, initialSearch, timelineEntries }: LeadsTabsProps) {
  const [tab, setTab] = useState<"leads" | "timeline">("leads");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "leads" | "timeline")}>
        <TabsList>
          <TabsTrigger value="leads">לידים</TabsTrigger>
          <TabsTrigger value="timeline"> פניות והזמנות</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "leads" ? (
        <LeadsManager leads={leads} initialSearch={initialSearch} />
      ) : (
        <LeadsTimeline entries={timelineEntries} />
      )}
    </div>
  );
}
