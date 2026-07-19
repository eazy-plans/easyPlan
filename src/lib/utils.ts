import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy", { locale: he });
}

/**
 * Serializes a Date to "YYYY-MM-DD" in Israel time. Never use
 * `toISOString().split("T")[0]` for event dates: a date picked at local
 * midnight in Israel (UTC+2/+3) converts to the previous day in UTC.
 */
export function toLocalDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);
}

/**
 * Earliest event date the UI fetches, as "YYYY-MM-DD". Event queries are
 * bounded to a rolling window because unbounded history degrades linearly as
 * records accumulate. Two years covers all operational lookups; pass a larger
 * value if a screen ever needs older records.
 */
export function eventsHistoryCutoffStr(years = 2): string {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return toLocalDateStr(cutoff);
}

/**
 * "dd/MM/yyyy, HH:mm" in Israel time. Timestamps must not be formatted with
 * date-fns directly - on Vercel the server runs in UTC, so the rendered hour
 * would be off by 2-3 hours from what the user expects.
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString("he-IL")}`;
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-]/g, "");
  return /^0\d{8,9}$/.test(digits);
}
