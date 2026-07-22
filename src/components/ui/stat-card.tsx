"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardTone = "primary" | "success" | "warning" | "violet";

const TONE_ICON_CLASSES: Record<StatCardTone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  violet: "bg-violet-500/10 text-violet-600",
};

const TONE_DOT_CLASSES: Record<StatCardTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  violet: "bg-violet-600",
};

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = React.useState(0);
  // Mirrors the rendered value so an interrupted animation (prop change,
  // StrictMode re-run) resumes from where it stopped instead of resetting.
  const displayed = React.useRef(0);
  React.useEffect(() => {
    const from = displayed.current;
    if (from === target) {
      setValue(target);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (target - from) * eased);
      displayed.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatCardValue({ value }: { value: number | string }) {
  const animated = useCountUp(typeof value === "number" ? value : 0);
  return <>{typeof value === "number" ? animated : value}</>;
}

export interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  tone: StatCardTone;
  href?: string;
  pulse?: boolean;
  className?: string;
}

export function StatCard({ label, value, sub, icon: Icon, tone, href, pulse, className }: StatCardProps) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground mb-2 truncate flex items-center gap-1.5">
          {pulse && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", TONE_DOT_CLASSES[tone])} />
              <span className={cn("relative inline-flex rounded-full h-2 w-2", TONE_DOT_CLASSES[tone])} />
            </span>
          )}
          {label}
        </p>
        <p className="text-3xl font-bold leading-none tabular-nums text-foreground">
          <StatCardValue value={value} />
        </p>
        {sub && <p className="text-sm text-muted-foreground mt-2">{sub}</p>}
      </div>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-md", TONE_ICON_CLASSES[tone])}>
        <Icon size={20} />
      </span>
    </div>
  );

  const tileClassName = cn(
    "group corner-brackets rounded-md border bg-card p-5 relative transition-all duration-200",
    href && "block hover:border-primary/30 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className
  );

  if (href) {
    return (
      <Link href={href} className={tileClassName}>
        {content}
        <ChevronLeft
          size={16}
          className="absolute bottom-4 left-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 translate-x-1 group-hover:translate-x-0"
        />
      </Link>
    );
  }

  return <div className={tileClassName}>{content}</div>;
}
