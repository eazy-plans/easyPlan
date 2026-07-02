"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, TrendingUp, Star, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/types/booking";
import type { EventRow } from "@/types/database";

const MONTH_NAMES = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function KpiCard({
  label, value, sub, icon: Icon, gradient,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; gradient: string;
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
function SimpleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-xl shadow-xl p-3 text-sm min-w-[100px]">
      <p className="font-bold border-b pb-1 mb-1">{label}</p>
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

interface Props {
  events: EventRow[];
  /** All-time non-cancelled count from the server - events only covers the recent history window. */
  allTimeCount: number;
}

export function VenueStatsPanel({ events, allTimeCount }: Props) {
  const currentYear = new Date().getFullYear();

  const yearEvents = useMemo(
    () => events.filter((e) => new Date(e.date).getFullYear() === currentYear && e.status !== "cancelled"),
    [events, currentYear]
  );

  const totalRevenue = useMemo(
    () => yearEvents.reduce((s, e) => s + Number(e.price_final ?? 0), 0),
    [yearEvents]
  );

  const avgPrice = yearEvents.length > 0 ? Math.round(totalRevenue / yearEvents.length) : 0;

  const byMonth = useMemo(() => {
    const counts  = Array(12).fill(0);
    const revenue = Array(12).fill(0);
    yearEvents.forEach((e) => {
      const m = new Date(e.date).getMonth();
      counts[m]++;
      revenue[m] += Number(e.price_final ?? 0);
    });
    return MONTH_NAMES.map((name, i) => ({
      name: name.slice(0, 3),
      count: counts[i],
      revenue: revenue[i],
    }));
  }, [yearEvents]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    yearEvents.forEach((e) => { map[e.event_type] = (map[e.event_type] ?? 0) + 1; });
    return Object.entries(map).map(([type, count]) => ({
      name: EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] ?? type,
      value: count,
      color: EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS] ?? "#94a3b8",
    }));
  }, [yearEvents]);

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="אירועים השנה"    value={yearEvents.length}        icon={CalendarDays} gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
        <KpiCard label="הכנסות השנה"     value={formatCurrency(totalRevenue)} icon={TrendingUp}  gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <KpiCard label="מחיר ממוצע"      value={formatCurrency(avgPrice)}  icon={Star}         gradient="bg-gradient-to-br from-amber-500 to-amber-700" />
        <KpiCard label="סה״כ אירועים"   value={allTimeCount}              icon={Users}        gradient="bg-gradient-to-br from-violet-500 to-violet-700" />
      </div>

      {yearEvents.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">אין אירועים לשנה זו</p>
      ) : (
        <>
          {/* By month */}
          <Card className="shadow-md rounded-2xl border-0 ring-1 ring-black/5">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-base font-semibold">אירועים והכנסות לפי חודש</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barGap={3}>
                  <defs>
                    <linearGradient id="sEvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="sRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={(v) => v === 0 ? "" : `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<SimpleTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                  <Bar yAxisId="left"  dataKey="count"   name="אירועים" fill="url(#sEvGrad)"  radius={[5,5,0,0]} maxBarSize={22} />
                  <Bar yAxisId="right" dataKey="revenue" name="הכנסות"  fill="url(#sRevGrad)" radius={[5,5,0,0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-3 justify-center">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />אירועים
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />הכנסות
                </span>
              </div>
            </CardContent>
          </Card>

          {/* By event type */}
          {byType.length > 0 && (
            <Card className="shadow-md rounded-2xl border-0 ring-1 ring-black/5">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-base font-semibold">התפלגות לפי סוג אירוע</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={56} outerRadius={82} paddingAngle={3} labelLine={false}>
                      {byType.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} אירועים`, ""]} />
                    <Legend
                      iconType="circle" iconSize={7} wrapperStyle={{ paddingTop: 16 }}
                      formatter={(v) => <span className="text-xs text-foreground">{v}</span>}
                    />
                    <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" fontSize={22} fontWeight={700}>
                      {yearEvents.length}
                    </text>
                    <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#6b7280">
                      סה״כ
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
