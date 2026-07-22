import { formatCurrency } from "@/lib/utils";

interface ChartTooltipItem {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipItem[];
  label?: string;
  /** Series name(s) to format as currency instead of a plain number. */
  currencyKeys?: string[];
}

/** Shared recharts tooltip for KPI charts (venue/lead stats panels). */
export function ChartTooltip({ active, payload, label, currencyKeys = ["הכנסות"] }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-xl shadow-xl p-3 text-sm min-w-[100px]">
      <p className="font-bold border-b pb-1 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="text-xs font-semibold">
            {currencyKeys.includes(p.name) ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
