"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { VenueCalendar } from "./VenueCalendar";
import { Skeleton } from "@/components/ui/skeleton";

const VenueCalendarLazy = dynamic(
  () => import("./VenueCalendar").then((m) => ({ default: m.VenueCalendar })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <Skeleton className="h-10 w-56 shrink-0" />
        <Skeleton className="flex-1 min-h-[520px] bg-muted/30 rounded-lg" />
      </div>
    ),
  }
);

export function VenueCalendarClient(props: ComponentProps<typeof VenueCalendar>) {
  return <VenueCalendarLazy {...props} />;
}
