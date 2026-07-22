import { cn } from "@/lib/utils";

export interface StatChipProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: "primary" | "success" | "warning" | "violet" | "muted";
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<StatChipProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  violet: "bg-violet-500/10 text-violet-600",
  muted: "bg-muted-foreground/10 text-muted-foreground",
};

/** Compact inline stat card used in strips atop list screens (Venues, Leads, Notifications, Settings). */
export function StatChip({ label, value, icon: Icon, tone = "primary", className }: StatChipProps) {
  return (
    <div className={cn("corner-brackets flex items-center justify-between gap-3 rounded-md border bg-card px-3.5 py-3", className)}>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
      </div>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", TONE_CLASSES[tone])}>
        <Icon size={16} />
      </span>
    </div>
  );
}
