"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { DashboardStats } from "./DashboardStats";

const DashboardStatsLazy = dynamic(
  () => import("./DashboardStats").then((m) => ({ default: m.DashboardStats })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-5 flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                <div className="h-7 w-14 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-9 w-9 bg-muted rounded-xl animate-pulse shrink-0" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-lg border bg-card p-5 h-56 bg-muted/20 animate-pulse" />
          <div className="rounded-lg border bg-card p-5 h-56 bg-muted/20 animate-pulse" />
        </div>
        <div className="rounded-lg border bg-card p-5 h-64 bg-muted/20 animate-pulse" />
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-lg border bg-card p-5 h-56 bg-muted/20 animate-pulse" />
          <div className="rounded-lg border bg-card p-5 h-56 bg-muted/20 animate-pulse" />
        </div>
        <div className="rounded-lg border bg-card p-5 h-40 bg-muted/20 animate-pulse" />
      </div>
    ),
  }
);

export function DashboardStatsClient(props: ComponentProps<typeof DashboardStats> & { hideLeads?: boolean }) {
  return <DashboardStatsLazy {...props} />;
}
