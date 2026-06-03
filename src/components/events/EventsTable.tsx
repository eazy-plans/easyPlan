"use client";

import { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS } from "@/types/booking";
import type { EventStatus, UserRole } from "@/types/database";
import { useRouter } from "next/navigation";

type EventRow = {
  id: string;
  date: string;
  event_type: string;
  event_purpose: string;
  status: EventStatus;
  client_name: string;
  client_phone: string;
  client_email: string;
  price_listed: number;
  discount_amount: number;
  price_final: number;
  notes: string | null;
  created_at: string;
  venue: { id: string; name: string; city: string } | null;
  creator: { full_name: string } | null;
};

const STATUS_LABELS: Record<EventStatus, string> = {
  approved: "מאושר",
  cancelled: "מבוטל",
};

const STATUS_VARIANT: Record<EventStatus, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  cancelled: "outline",
};

interface EventsTableProps {
  events: EventRow[];
  role: UserRole;
}

export function EventsTable({ events: initialEvents, role }: EventsTableProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => events.filter((ev) => {
    const matchStatus = statusFilter === "all" || ev.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      ev.client_name.toLowerCase().includes(q) ||
      ev.client_phone.includes(q) ||
      (ev.venue?.name ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [events, search, statusFilter]);

  async function cancelEvent(eventId: string) {
    setCancellingId(eventId);
    try {
      const res = await fetch("/api/events/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      if (!res.ok) { toast.error("שגיאה בביטול האירוע"); return; }

      const { notified } = await res.json();
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status: "cancelled" } : e));
      toast.success(notified > 0 ? `האירוע בוטל — ${notified} לידים עודכנו` : "האירוע בוטל");
      startTransition(() => router.refresh());
    } finally {
      setCancellingId(null);
    }
  }

  const canCancel = role === "admin" || role === "secretary";

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="חיפוש"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EventStatus | "all")}>
          <SelectTrigger dir="rtl" className="w-full sm:w-44">
            <SelectValue placeholder="כל הסטטוסים" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {(Object.entries(STATUS_LABELS) as [EventStatus, string][]).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} אירועים</p>

      {/* Scrollable table area */}
      <div className="flex-1 overflow-y-auto min-h-0">

      {/* Table (desktop) */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-right px-4 py-3 font-medium">תאריך</th>
              <th className="text-right px-4 py-3 font-medium">אולם</th>
              <th className="text-right px-4 py-3 font-medium">לקוח</th>
              <th className="text-right px-4 py-3 font-medium">סוג</th>
              <th className="text-right px-4 py-3 font-medium">מחיר סופי</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">אין אירועים תואמים</td>
              </tr>
            )}
            {filtered.map((ev) => (
              <tr key={ev.id} className="border-t hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(new Date(ev.date))}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{ev.venue?.name ?? "—"}</div>
                  <div className="text-muted-foreground text-xs">{ev.venue?.city}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{ev.client_name}</div>
                  <div className="text-muted-foreground text-xs" dir="ltr">{ev.client_phone}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{EVENT_TYPE_LABELS[ev.event_type as keyof typeof EVENT_TYPE_LABELS] ?? ev.event_type}</div>
                  <div className="text-xs text-muted-foreground">{EVENT_PURPOSE_LABELS[ev.event_purpose as keyof typeof EVENT_PURPOSE_LABELS] ?? ev.event_purpose}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(ev.price_final)}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[ev.status]}>{STATUS_LABELS[ev.status]}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    {canCancel && ev.status !== "cancelled" && (
                      <Button size="sm" variant="outline" onClick={() => cancelEvent(ev.id)} disabled={cancellingId === ev.id || isPending}>
                        {cancellingId === ev.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "בטל"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && (
          <p className="text-center py-10 text-muted-foreground">אין אירועים תואמים</p>
        )}
        {filtered.map((ev) => (
          <div key={ev.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{ev.client_name}</p>
                <p className="text-sm text-muted-foreground" dir="ltr">{ev.client_phone}</p>
              </div>
              <Badge variant={STATUS_VARIANT[ev.status]}>{STATUS_LABELS[ev.status]}</Badge>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">תאריך</span>
                <span>{formatDate(new Date(ev.date))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">אולם</span>
                <span>{ev.venue?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">סוג</span>
                <span>{EVENT_TYPE_LABELS[ev.event_type as keyof typeof EVENT_TYPE_LABELS] ?? ev.event_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">מחיר</span>
                <span className="font-medium">{formatCurrency(ev.price_final)}</span>
              </div>
            </div>
            {canCancel && ev.status !== "cancelled" && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => cancelEvent(ev.id)} disabled={cancellingId === ev.id || isPending}>
                  {cancellingId === ev.id ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "בטל"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      </div>{/* end scrollable area */}
    </div>
  );
}
