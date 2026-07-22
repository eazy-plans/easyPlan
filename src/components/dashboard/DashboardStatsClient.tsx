"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { DashboardStats } from "./DashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardStatsLazy = dynamic(
  () => import("./DashboardStats").then((m) => ({ default: m.DashboardStats })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-md border bg-card p-5 flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-14" />
              </div>
              <Skeleton className="h-11 w-11 rounded-md shrink-0" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <Skeleton className="rounded-lg border bg-card p-5 h-56 bg-muted/20" />
          <Skeleton className="rounded-lg border bg-card p-5 h-56 bg-muted/20" />
        </div>
        <Skeleton className="rounded-lg border bg-card p-5 h-64 bg-muted/20" />
        <div className="grid md:grid-cols-2 gap-5">
          <Skeleton className="rounded-lg border bg-card p-5 h-56 bg-muted/20" />
          <Skeleton className="rounded-lg border bg-card p-5 h-56 bg-muted/20" />
        </div>
        <Skeleton className="rounded-lg border bg-card p-5 h-40 bg-muted/20" />
      </div>
    ),
  }
);

export function DashboardStatsClient(props: ComponentProps<typeof DashboardStats> & { hideLeads?: boolean }) {
  return <DashboardStatsLazy {...props} />;
}
