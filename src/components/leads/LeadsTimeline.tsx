"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, PartyPopper, MessageCircleQuestion, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { toHebrewDateShort } from "@/lib/hebrew-calendar";
import { INQUIRY_STATUS_LABELS, INQUIRY_STATUS_VARIANT } from "@/types/leads";
import type { LeadInquiryStatus, EventStatus } from "@/types/database";

export interface TimelineEntry {
  id: string;
  kind: "inquiry" | "order";
  createdAt: string;
  leadId: string | null;
  leadName: string;
  venueName: string | null;
  status: LeadInquiryStatus | EventStatus;
}

const ORDER_STATUS_LABELS: Record<EventStatus, string> = { approved: "אושר", cancelled: "בוטל" };
const ORDER_STATUS_VARIANT: Record<EventStatus, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  cancelled: "outline",
};

interface LeadsTimelineProps {
  entries: TimelineEntry[];
}

const KIND_FILTER_OPTIONS = [
  { value: "inquiry", label: "פניות" },
  { value: "order", label: "הזמנות" },
];

// L2: chronological feed of lead_inquiries (not yet booked) and events
// (actual orders), sorted by created_at, deliberately NOT grouped by lead -
// that's what the card grid in the "לידים" tab is for.
export function LeadsTimeline({ entries }: LeadsTimelineProps) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const matchKind = !kindFilter || e.kind === kindFilter;
      const matchSearch = !q || e.leadName.toLowerCase().includes(q) || (e.venueName ?? "").toLowerCase().includes(q);
      return matchKind && matchSearch;
    });
  }, [entries, search, kindFilter]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Input
          placeholder="חיפוש"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Combobox
          options={KIND_FILTER_OPTIONS}
          value={kindFilter}
          onValueChange={setKindFilter}
          placeholder="הכל (פניות והזמנות)"
          className="w-full sm:w-56"
        />
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} רשומות</p>

      <div className="flex-1 overflow-y-auto min-h-0 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
            <Inbox size={28} strokeWidth={1.5} className="text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">אין רשומות תואמות</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 border rounded-lg">
            {filtered.map((entry) => {
              const isOrder = entry.kind === "order";
              const href = isOrder ? `/events/${entry.id}` : entry.leadId ? `/leads/${entry.leadId}` : undefined;
              const content = (
                <div className="group flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isOrder ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                      {isOrder ? <PartyPopper size={15} /> : <MessageCircleQuestion size={15} />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {entry.leadName} · {entry.venueName ?? "-"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={isOrder ? "outline" : "secondary"} className="text-[10px]">
                      {isOrder ? "הזמנה" : "פנייה"}
                    </Badge>
                    <Badge variant={isOrder ? ORDER_STATUS_VARIANT[entry.status as EventStatus] : INQUIRY_STATUS_VARIANT[entry.status as LeadInquiryStatus]}>
                      {isOrder ? ORDER_STATUS_LABELS[entry.status as EventStatus] : INQUIRY_STATUS_LABELS[entry.status as LeadInquiryStatus]}
                    </Badge>
                    {href && <ChevronLeft size={15} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />}
                  </div>
                </div>
              );
              return href ? <Link key={`${entry.kind}-${entry.id}`} href={href}>{content}</Link> : <div key={`${entry.kind}-${entry.id}`}>{content}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
