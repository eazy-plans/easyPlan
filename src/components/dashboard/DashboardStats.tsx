"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, EVENT_PURPOSE_LABELS } from "@/types/booking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { CHART_GRADIENTS } from "@/lib/chart-colors";
import {
  CalendarDays, TrendingUp, Users, Building2, ChevronLeft, CalendarClock, BellRing,
} from "lucide-react";

const MONTH_NAMES = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];


// Lead statuses - match actual DB values from LeadStatus type
const LEAD_STATUS_ORDER = ["new", "considering", "waiting_for_date", "date_taken", "booked", "cancelled", "too_expensive", "not_relevant"];
const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "פנייה חדשה",
  considering: "שוקל/ת",
  waiting_for_date: "ממתין/ה לתאריך",
  date_taken: "תאריך תפוס",
  booked: "הוזמן",
  cancelled: "בוטל",
  too_expensive: "יקר מדי",
  not_relevant: "לא רלוונטי",
};
const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "#0ea5e9",
  considering: "#f59e0b",
  waiting_for_date: "#f97316",
  date_taken: "#64748b",
  booked: "#10b981",
  cancelled: "#ef4444",
  too_expensive: "#94a3b8",
  not_relevant: "#94a3b8",
};

const RANK_STYLES = [
  { badge: "bg-yellow-400 text-yellow-900", bar: "#f59e0b" },
  { badge: "bg-slate-300 text-slate-700", bar: "#94a3b8" },
  { badge: "bg-orange-300 text-orange-900", bar: "#fb923c" },
  { badge: "bg-muted text-muted-foreground", bar: "#6b7280" },
  { badge: "bg-muted text-muted-foreground", bar: "#6b7280" },
];

type EventRow = {
  id: string;
  date: string;
  event_type: string;
  event_purpose: string;
  status: string;
  client_name: string;
  price_final: number;
  venue_id: string;
  venue: { name: string; city?: string } | null;
};

type LeadRow = { id: string; status: string };
type VenueRow = { id: string; name: string };
type PendingInquiry = {
  id: string;
  lead_id: string;
  status: string;
  leads?: { client_name: string } | { client_name: string }[] | null;
  venues?: { name: string } | { name: string }[] | null;
};

// Supabase serializes to-one joins as an object but the loose typing allows
// arrays; normalize so render code doesn't care.
function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

interface DashboardStatsProps {
  events: EventRow[];
  leads: LeadRow[];
  venues: VenueRow[];
  pendingInquiries?: PendingInquiry[];
  hideLeads?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label, dotColor }: any) {
  if (!active || !payload?.length) return null;
  return (
    // Explicit dir="rtl": the byCity chart wraps its whole subtree (including
    // recharts' tooltip portal) in dir="ltr" to work around an axis-label bug,
    // which otherwise flips this tooltip's layout left-to-right.
    <div dir="rtl" className="bg-background border rounded-xl shadow-xl p-3 text-sm space-y-1.5 min-w-[110px]">
      <p className="font-bold text-foreground border-b pb-1.5 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold">{p.value}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {/* Bars are filled via a gradient url(#...) - recharts can't derive
                a swatch color from that for the payload, so an explicit solid
                color is passed in per chart instead of relying on p.color
                (always undefined here, which rendered an invisible dot). */}
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor ?? p.color }} />
            {p.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function daysUntilChip(diff: number) {
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/10 rounded-full px-2.5 py-1 shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/80 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
        </span>
        היום
      </span>
    );
  }
  if (diff === 1) {
    return (
      <span className="text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1 shrink-0">
        מחר
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1 shrink-0">
      בעוד {diff} ימים
    </span>
  );
}

export function DashboardStats({ events, leads, venues, pendingInquiries = [], hideLeads = false }: DashboardStatsProps) {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const nowMs    = Date.now();
  const nowDate  = new Date(nowMs);
  const monthStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`;

  const eventsToday = useMemo(
    () => events.filter(e => e.date === todayStr).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events]
  );
  const eventsThisMonth = useMemo(
    () => events.filter(e => e.date.startsWith(monthStr)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events]
  );

  // Live feed: next events from today onward; when viewing a past year fall
  // back to the latest events so the panel is never dead.
  const { feedEvents, feedIsUpcoming } = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = sorted.filter((e) => e.date >= todayStr).slice(0, 6);
    if (upcoming.length > 0) return { feedEvents: upcoming, feedIsUpcoming: true };
    return { feedEvents: sorted.slice(-6).reverse(), feedIsUpcoming: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const byMonth = useMemo(() => {
    const counts = Array(12).fill(0);
    events.forEach((e) => {
      const m = new Date(e.date).getMonth();
      counts[m]++;
    });
    // Recharts always lays out categories left-to-right in SVG space,
    // ignoring the page's dir="rtl". Reversed here so the chart reads the way
    // a Hebrew RTL reader expects a timeline to flow: January on the right,
    // December on the left.
    return MONTH_NAMES.map((name, i) => ({
      name: name.slice(0, 3),
      count: counts[i],
    })).reverse();
  }, [events]);

  const byCity = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => {
      const city = e.venue?.city ?? "לא ידוע";
      map[city] = (map[city] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [events]);

  const leadsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => { map[l.status] = (map[l.status] ?? 0) + 1; });
    return LEAD_STATUS_ORDER
      .map((status) => ({
        status,
        name: LEAD_STATUS_LABELS[status] ?? status,
        value: map[status] ?? 0,
        color: LEAD_STATUS_COLORS[status] ?? "#94a3b8",
      }))
      .filter((x) => x.value > 0);
  }, [leads]);

  const topVenues = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    events.forEach((e) => {
      if (!map[e.venue_id]) map[e.venue_id] = { name: e.venue?.name ?? "-", count: 0, revenue: 0 };
      map[e.venue_id].count++;
      if (e.status === "approved") map[e.venue_id].revenue += e.price_final ?? 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [events]);

  const bookedLeads = leads.filter(l => l.status === "booked").length;
  const conversionRate = leads.length > 0 ? Math.round((bookedLeads / leads.length) * 100) : 0;
  const maxVenueCount = topVenues[0]?.count ?? 1;

  const todayMs = Date.parse(todayStr);
  const eventsHref = hideLeads ? "/calendar" : "/events";
  const showPending = !hideLeads && pendingInquiries.length > 0;

  const upcomingCard = (
    <Card variant="elevated" className="flex flex-col h-full">
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarClock size={16} className="text-primary" />
          {feedIsUpcoming ? "אירועים קרובים" : "אירועים אחרונים"}
        </CardTitle>
        <Link
          href={eventsHref}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-0.5"
        >
          לכל האירועים
          <ChevronLeft size={13} />
        </Link>
      </CardHeader>
      <CardContent className="px-2.5 pb-2.5 flex-1">
        {feedEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-10">לא נמצאו אירועים לשנה זו</p>
        ) : (
          <div className="divide-y divide-border/60">
            {feedEvents.map((ev) => {
              const d = new Date(ev.date);
              const diff = Math.round((Date.parse(ev.date) - todayMs) / 86_400_000);
              return (
                <Link
                  key={ev.id}
                  href={hideLeads ? "/calendar" : `/events/${ev.id}`}
                  className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/60 transition-colors"
                >
                  <div className="w-11 shrink-0 rounded-xl bg-muted/70 py-1.5 text-center">
                    <div className="text-base font-bold leading-tight tabular-nums">{format(d, "d")}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{format(d, "LLL", { locale: he })}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {EVENT_PURPOSE_LABELS[ev.event_purpose as keyof typeof EVENT_PURPOSE_LABELS] ?? ev.event_purpose}
                      {ev.client_name ? ` · ${ev.client_name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: EVENT_TYPE_COLORS[ev.event_type as keyof typeof EVENT_TYPE_COLORS] ?? "#94a3b8" }}
                      />
                      {EVENT_TYPE_LABELS[ev.event_type as keyof typeof EVENT_TYPE_LABELS] ?? ev.event_type}
                      {ev.venue?.name ? ` · ${ev.venue.name}` : ""}
                    </p>
                  </div>
                  {feedIsUpcoming ? (
                    daysUntilChip(diff)
                  ) : (
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1 shrink-0">
                      {format(d, "EEEE", { locale: he })}
                    </span>
                  )}
                  <ChevronLeft size={15} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const pendingCard = showPending && (
    <Card variant="elevated" className="ring-warning/30 bg-gradient-to-b from-warning/10 to-transparent">
      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BellRing size={16} className="text-warning" />
          ממתינים לטיפול
          <span className="text-[11px] font-bold bg-warning text-warning-foreground rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
            {pendingInquiries.length}
          </span>
        </CardTitle>
        <Link
          href="/leads"
          className="text-xs font-medium text-warning hover:text-warning/80 flex items-center gap-0.5"
        >
          לכל הלידים
          <ChevronLeft size={13} />
        </Link>
      </CardHeader>
      <CardContent className="px-2.5 pb-2.5">
        <div className="divide-y divide-border/60">
          {pendingInquiries.slice(0, 5).map((inq) => {
            const lead = one(inq.leads);
            const venue = one(inq.venues);
            return (
              <Link
                key={inq.id}
                href={`/leads/${inq.lead_id}`}
                className="group flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-warning/10 transition-colors"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: LEAD_STATUS_COLORS[inq.status] ?? "#94a3b8" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{lead?.client_name ?? "-"}</p>
                  {venue?.name && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{venue.name}</p>
                  )}
                </div>
                <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1 shrink-0">
                  {LEAD_STATUS_LABELS[inq.status] ?? inq.status}
                </span>
                <ChevronLeft size={15} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const funnelCard = !hideLeads && (
    <Card variant="elevated" className="flex flex-col">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">מעקב לידים</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1">
        {leadsByStatus.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-10">אין לידים רשומים</p>
        ) : (
          <div className="space-y-3 pt-1">
            {leadsByStatus.map((l) => {
              const pct = Math.round((l.value / (leads.length || 1)) * 100);
              return (
                <div key={l.status} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                      <span className="text-sm text-foreground">{l.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                      <span className="text-sm font-bold w-5 text-left">{l.value}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: l.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const byMonthCard = (
    <Card variant="elevated">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">אירועים לפי חודש</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={byMonth} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_GRADIENTS.primary.from} stopOpacity={1} />
                <stop offset="100%" stopColor={CHART_GRADIENTS.primary.to} stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
            <Tooltip content={<ChartTooltip dotColor={CHART_GRADIENTS.primary.from} />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
            <Bar dataKey="count" name="אירועים" fill="url(#eventGrad)" radius={[5, 5, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const byCityCard = (
    <Card variant="elevated">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">התפלגות לפי עיר</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {byCity.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">לא נמצאו אירועים לשנה זו</p>
        ) : (
          // recharts lays out ticks assuming LTR coordinates; under the page's
          // RTL direction the Y-axis label anchor flips and text overflows past
          // the card edge. Force LTR just for the chart subtree, and mirror the
          // axes explicitly (labels on the right, bars growing right-to-left)
          // so the chart still reads the way an RTL user expects instead of
          // looking like a plain flipped-LTR chart.
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={byCity} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 12 }}>
                <defs>
                  <linearGradient id="cityGrad" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor={CHART_GRADIENTS.violet.from} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_GRADIENTS.violet.to} stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" reversed tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={96} interval={0} />
                <Tooltip content={<ChartTooltip dotColor={CHART_GRADIENTS.violet.from} />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                <Bar dataKey="count" name="אירועים" fill="url(#cityGrad)" radius={[5, 0, 0, 5]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const topVenuesCard = topVenues.length > 0 && (
    <Card variant="elevated">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">דירוג אולמות</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-3">
          {topVenues.map((v, i) => {
            const rank = RANK_STYLES[i] ?? RANK_STYLES[3];
            return (
              <div key={v.name} className="flex items-center gap-3">
                <span className={`text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${rank.badge}`}>
                  {i + 1}
                </span>
                <span className="text-sm font-semibold w-24 truncate shrink-0 text-right">{v.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(v.count / maxVenueCount) * 100}%`, backgroundColor: rank.bar }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-14 shrink-0 text-center">{v.count}</span>
                <span className="text-xs font-semibold text-success w-20 shrink-0 text-left">
                  {formatCurrency(v.revenue)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className={`grid gap-3 ${hideLeads ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
        <StatCard label="אירועים היום" value={eventsToday} icon={CalendarDays} tone="primary" href={eventsHref} pulse={eventsToday > 0} />
        <StatCard label="אירועים החודש" value={eventsThisMonth} sub={`${events.length} השנה`} icon={TrendingUp} tone="success" href={eventsHref} />
        {!hideLeads && (
          <StatCard label="לידים" value={leads.length} sub={`שיעור המרה ${conversionRate}%`} icon={Users} tone="warning" href="/leads" />
        )}
        <StatCard label="אולמות פעילים" value={venues.length} icon={Building2} tone="violet" href="/venues" />
      </div>

      {/* Primary bento: wide upcoming feed + a stacked side column */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">{upcomingCard}</div>
        <div className="flex flex-col gap-4">
          {pendingCard}
          {funnelCard}
          {hideLeads && topVenuesCard}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {byMonthCard}
        {byCityCard}
      </div>

      {/* Top venues (admin, full width) */}
      {!hideLeads && topVenuesCard}
    </div>
  );
}
