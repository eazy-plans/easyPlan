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

export function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString("he-IL")}`;
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-]/g, "");
  return /^0\d{8,9}$/.test(digits);
}
