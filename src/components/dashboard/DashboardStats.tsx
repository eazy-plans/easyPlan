"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/types/booking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, TrendingUp, Users, Building2 } from "lucide-react";

const MONTH_NAMES = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];


// Lead statuses — match actual DB values from LeadStatus type
const LEAD_STATUS_ORDER = ["new", "considering", "waiting_for_date", "date_taken", "booked", "cancelled"];
const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "פנייה חדשה",
  considering: "שוקל/ת",
  waiting_for_date: "ממתין/ה לתאריך",
  date_taken: "תאריך תפוס",
  booked: "הוזמן",
  cancelled: "בוטל",
};
const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "#0ea5e9",       // sky  — fresh/new
  considering: "#f59e0b", // amber — undecided
  waiting_for_date: "#f97316", // orange — pending
  date_taken: "#64748b",  // slate — blocked
  booked: "#10b981",    // emerald — success
  cancelled: "#ef4444", // red   — lost
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
  status: string;
  price_final: number;
  venue_id: string;
  venue: { name: string } | null;
};

type LeadRow = { id: string; status: string };
type VenueRow = { id: string; name: string };

interface DashboardStatsProps {
  events: EventRow[];
  leads: LeadRow[];
  venues: VenueRow[];
  hideLeads?: boolean;
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${gradient} text-white shadow-lg relative overflow-hidden`}>
      <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full bg-black/10 pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80 mb-2 truncate">{label}</p>
          <p className="text-3xl font-bold leading-none">{value}</p>
          {sub && <p className="text-sm text-white/75 mt-2">{sub}</p>}
        </div>
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl shrink-0">
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MonthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-xl shadow-xl p-3 text-sm space-y-1.5 min-w-[130px]">
      <p className="font-bold text-foreground border-b pb-1.5 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="text-xs font-semibold">
            {p.name === "הכנסות" ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutCenterLabel({ viewBox, total }: any) {
  const { cx, cy } = viewBox ?? {};
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fontSize={22} fontWeight={700} fill="currentColor">{total}</tspan>
      <tspan x={cx} dy="1.4em" fontSize={11} fill="#6b7280">סה״כ</tspan>
    </text>
  );
}

export function DashboardStats({ events, leads, venues, hideLeads = false }: DashboardStatsProps) {
  const totalRevenue = useMemo(
    () => events.filter(e => e.status === "approved").reduce((s, e) => s + (e.price_final ?? 0), 0),
    [events]
  );

  const byMonth = useMemo(() => {
    const counts = Array(12).fill(0);
    const revenue = Array(12).fill(0);
    events.forEach((e) => {
      const m = new Date(e.date).getMonth();
      counts[m]++;
      if (e.status === "approved") revenue[m] += e.price_final ?? 0;
    });
    return MONTH_NAMES.map((name, i) => ({
      name: name.slice(0, 3),
      count: counts[i],
      revenue: revenue[i],
    }));
  }, [events]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => { map[e.event_type] = (map[e.event_type] ?? 0) + 1; });
    return Object.entries(map).map(([type, count]) => ({
      name: EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] ?? type,
      value: count,
      color: EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS] ?? "#94a3b8",
    }));
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
      if (!map[e.venue_id]) map[e.venue_id] = { name: e.venue?.name ?? "—", count: 0, revenue: 0 };
      map[e.venue_id].count++;
      if (e.status === "approved") map[e.venue_id].revenue += e.price_final ?? 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [events]);

  const bookedLeads = leads.filter(l => l.status === "booked").length;
  const conversionRate = leads.length > 0 ? Math.round((bookedLeads / leads.length) * 100) : 0;
  const maxVenueCount = topVenues[0]?.count ?? 1;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className={`grid gap-4 ${hideLeads ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
        <KpiCard
          label="אירועים השנה"
          value={events.length}
          icon={CalendarDays}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
        />
        <KpiCard
          label="הכנסות"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
        />
        {!hideLeads && (
          <KpiCard
            label="לידים"
            value={leads.length}
            sub={`שיעור המרה ${conversionRate}%`}
            icon={Users}
            gradient="bg-gradient-to-br from-orange-400 to-orange-600"
          />
        )}
        <KpiCard
          label="אולמות פעילים"
          value={venues.length}
          icon={Building2}
          gradient="bg-gradient-to-br from-violet-500 to-violet-700"
        />
      </div>

      {/* Events + Revenue by month */}
      <Card className="shadow-md rounded-2xl border-0 ring-1 ring-black/5">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-base font-semibold text-foreground">
            אירועים והכנסות לפי חודש
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMonth} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barGap={3}>
              <defs>
                <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) => v === 0 ? "" : `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<MonthTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
              <Bar yAxisId="left" dataKey="count" name="אירועים" fill="url(#eventGrad)" radius={[5, 5, 0, 0]} maxBarSize={22} />
              <Bar yAxisId="right" dataKey="revenue" name="הכנסות" fill="url(#revenueGrad)" radius={[5, 5, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-5 mt-3 justify-center">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
              אירועים
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              הכנסות
            </span>
          </div>
        </CardContent>
      </Card>

      <div className={hideLeads ? "" : "grid md:grid-cols-2 gap-5"}>
        {/* By event type — donut with center label */}
        <Card className="shadow-md rounded-2xl border-0 ring-1 ring-black/5">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-base font-semibold text-foreground">
              התפלגות לפי סוג אירוע
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {byType.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">לא נמצאו אירועים לשנה זו</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={byType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={3}
                    labelLine={false}
                  >
                    {byType.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} אירועים`, ""]} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ paddingTop: 24 }}
                    formatter={(v) => <span className="text-xs text-foreground">{v}</span>}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fontSize={22} fontWeight={700}>
                    {events.length}
                  </text>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#6b7280">
                    סה״כ
                  </text>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Lead funnel — admin only */}
        {!hideLeads && (
          <Card className="shadow-md rounded-2xl border-0 ring-1 ring-black/5">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-base font-semibold text-foreground">
                מעקב לידים
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {leadsByStatus.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-12">אין לידים רשומים</p>
              ) : (
                <div className="space-y-3.5 pt-2">
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
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
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
        )}
      </div>

      {/* Top venues */}
      {topVenues.length > 0 && (
        <Card className="shadow-md rounded-2xl border-0 ring-1 ring-black/5">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-base font-semibold text-foreground">
              דירוג אולמות
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-4">
              {topVenues.map((v, i) => {
                const rank = RANK_STYLES[i] ?? RANK_STYLES[3];
                return (
                  <div key={v.name} className="flex items-center gap-3">
                    <span className={`text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${rank.badge}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold w-28 truncate shrink-0 text-right">{v.name}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(v.count / maxVenueCount) * 100}%`,
                          backgroundColor: rank.bar,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 shrink-0 text-center">{v.count} אירועים</span>
                    <span className="text-xs font-semibold text-emerald-600 w-24 shrink-0 text-left">
                      {formatCurrency(v.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
