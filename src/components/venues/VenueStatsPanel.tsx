"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { CHART_GRADIENTS } from "@/lib/chart-colors";
import { CalendarDays, TrendingUp, Star, Users, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/types/booking";
import type { EventRow } from "@/types/database";

const MONTH_NAMES = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function pctDeltaLabel(current: number, previous: number): string | undefined {
  if (previous <= 0) return undefined;
  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta >= 0 ? "+" : ""}${delta}% לעומת אשתקד`;
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

  const lastYearEvents = useMemo(
    () => events.filter((e) => new Date(e.date).getFullYear() === currentYear - 1 && e.status !== "cancelled"),
    [events, currentYear]
  );

  const cancelledThisYear = useMemo(
    () => events.filter((e) => new Date(e.date).getFullYear() === currentYear && e.status === "cancelled").length,
    [events, currentYear]
  );

  const totalRevenue = useMemo(
    () => yearEvents.reduce((s, e) => s + Number(e.price_final ?? 0), 0),
    [yearEvents]
  );

  const lastYearRevenue = useMemo(
    () => lastYearEvents.reduce((s, e) => s + Number(e.price_final ?? 0), 0),
    [lastYearEvents]
  );

  const avgPrice = yearEvents.length > 0 ? Math.round(totalRevenue / yearEvents.length) : 0;

  const cancellationRate = (yearEvents.length + cancelledThisYear) > 0
    ? Math.round((cancelledThisYear / (yearEvents.length + cancelledThisYear)) * 100)
    : 0;

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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="אירועים השנה"
          value={yearEvents.length}
          sub={pctDeltaLabel(yearEvents.length, lastYearEvents.length)}
          icon={CalendarDays}
          tone="primary"
        />
        <StatCard
          label="הכנסות השנה"
          value={formatCurrency(totalRevenue)}
          sub={pctDeltaLabel(totalRevenue, lastYearRevenue)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard label="מחיר ממוצע" value={formatCurrency(avgPrice)} icon={Star} tone="warning" />
        <StatCard
          label="בוטלו השנה"
          value={cancelledThisYear}
          sub={cancelledThisYear > 0 ? `${cancellationRate}% מהפניות` : undefined}
          icon={XCircle}
          tone="warning"
        />
        <StatCard label="סה״כ אירועים" value={allTimeCount} icon={Users} tone="violet" />
      </div>

      {yearEvents.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground">אין אירועים לשנה זו</p>
      ) : (
        <>
          {/* By month */}
          <Card variant="elevated">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-base font-semibold">אירועים והכנסות לפי חודש</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barGap={3}>
                  <defs>
                    <linearGradient id="sEvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_GRADIENTS.primary.from} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_GRADIENTS.primary.to} stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="sRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_GRADIENTS.success.from} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_GRADIENTS.success.to} stopOpacity={0.85} />
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
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                  <Bar yAxisId="left"  dataKey="count"   name="אירועים" fill="url(#sEvGrad)"  radius={[5,5,0,0]} maxBarSize={22} />
                  <Bar yAxisId="right" dataKey="revenue" name="הכנסות"  fill="url(#sRevGrad)" radius={[5,5,0,0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-3 justify-center">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm bg-primary inline-block" />אירועים
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm bg-success inline-block" />הכנסות
                </span>
              </div>
            </CardContent>
          </Card>

          {/* By event type */}
          {byType.length > 0 && (
            <Card variant="elevated">
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
                    <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="hsl(var(--muted-foreground))">
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
