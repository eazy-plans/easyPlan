"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, TrendingUp, Users, Building2 } from "lucide-react";

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
  status: string;
  price_final: number;
  venue_id: string;
  venue: { name: string; city?: string } | null;
};

type LeadRow = { id: string; status: string };
type VenueRow = { id: string; name: string };
type PendingInquiry = { id: string; status: string };

interface DashboardStatsProps {
  events: EventRow[];
  leads: LeadRow[];
  venues: VenueRow[];
  pendingInquiries?: PendingInquiry[];
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
    <div className="bg-background border rounded-xl shadow-xl p-3 text-sm space-y-1.5 min-w-[110px]">
      <p className="font-bold text-foreground border-b pb-1.5 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="text-xs font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
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

  const byMonth = useMemo(() => {
    const counts = Array(12).fill(0);
    events.forEach((e) => {
      const m = new Date(e.date).getMonth();
      counts[m]++;
    });
    return MONTH_NAMES.map((name, i) => ({
      name: name.slice(0, 3),
      count: counts[i],
    }));
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

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className={`grid gap-4 ${hideLeads ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
        <KpiCard
          label="אירועים היום"
          value={eventsToday}
          icon={CalendarDays}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
        />
        <KpiCard
          label="אירועים החודש"
          value={eventsThisMonth}
          sub={`${events.length} השנה`}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
        />
        {!hideLeads && (
          <>
            <KpiCard
              label="לידים"
              value={leads.length}
              sub={`שיעור המרה ${conversionRate}%`}
              icon={Users}
              gradient="bg-gradient-to-br from-orange-400 to-orange-600"
            />
            {pendingInquiries.length > 0 && (
              <KpiCard
                label="ממתינים לאישור"
                value={pendingInquiries.length}
                icon={CalendarDays}
                gradient="bg-gradient-to-br from-amber-500 to-amber-700"
              />
            )}
          </>
        )}
        <KpiCard
          label="אולמות פעילים"
          value={venues.length}
          icon={Building2}
          gradient="bg-gradient-to-br from-violet-500 to-violet-700"
        />
      </div>

      {/* Events by month */}
      <Card className="shadow-md rounded-2xl border-0 ring-1 ring-black/5">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-base font-semibold text-foreground">
            אירועים לפי חודש
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMonth} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip content={<MonthTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
              <Bar dataKey="count" name="אירועים" fill="url(#eventGrad)" radius={[5, 5, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className={hideLeads ? "" : "grid md:grid-cols-2 gap-5"}>
        {/* By city */}
        <Card className="shadow-md rounded-2xl border-0 ring-1 ring-black/5">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-base font-semibold text-foreground">
              התפלגות לפי עיר
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {byCity.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">לא נמצאו אירועים לשנה זו</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={byCity} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cityGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
                  <Tooltip formatter={(v) => [`${v} אירועים`, "עיר"]} />
                  <Bar dataKey="count" name="אירועים" fill="url(#cityGrad)" radius={[0, 5, 5, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Lead funnel - admin only */}
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
