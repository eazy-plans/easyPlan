import { escapeHtml } from "../escapeHtml";

// Shared building blocks for the HTML emails. Gmail and Outlook.com strip the
// <html>/<body> tags and every <head> style when rendering, so RTL direction
// and all styling live inline on the content elements themselves.

const TEXT = "font-size:14px;color:#374151;line-height:1.6;";

export function emailShell(contentHtml: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><style>body{background:#f9f9f9;margin:0;padding:0;}</style></head>
<body dir="rtl" style="background:#f9f9f9;margin:0;padding:0;">
<div dir="rtl" style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:8px;padding:32px 36px;border:1px solid #e5e7eb;direction:rtl;text-align:right;font-family:Arial,Helvetica,sans-serif;">
${contentHtml}
<div style="font-size:13px;color:#6b7280;margin-top:24px;border-top:1px solid #f3f4f6;padding-top:16px;">EazyPlans<br>מערכת ניהול והזמנת אירועים</div>
</div>
</body></html>`;
}

export function heading(text: string, color = "#111111"): string {
  return `<h2 style="font-size:18px;color:${color};margin:0 0 20px;">${escapeHtml(text)}</h2>`;
}

// Callers escape any user data they interpolate into `html`.
export function p(html: string): string {
  return `<p style="${TEXT}margin:0 0 12px;">${html}</p>`;
}

// Phone numbers, hours and email addresses would be reordered by the RTL
// context without an explicit LTR span.
export function ltrSpan(value: string): string {
  return `<span dir="ltr">${escapeHtml(value)}</span>`;
}

// One label/value line in a details card. Rows without a value are dropped
// entirely rather than rendered as an empty label.
export function row(label: string, value?: string | null, opts?: { ltr?: boolean }): string {
  if (!value) return "";
  const rendered = opts?.ltr ? ltrSpan(value) : escapeHtml(value);
  return `<tr><td style="${TEXT}padding:4px 0 4px 12px;color:#6b7280;width:110px;vertical-align:top;text-align:right;">${label}</td><td style="${TEXT}padding:4px 0;vertical-align:top;text-align:right;">${rendered}</td></tr>`;
}

export function detailsCard(title: string, rowsHtml: string): string {
  return `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 20px;margin:20px 0;">
<div style="font-size:14px;font-weight:bold;color:#111111;margin:0 0 8px;">${escapeHtml(title)}</div>
<table dir="rtl" width="100%" style="border-collapse:collapse;">${rowsHtml}</table>
</div>`;
}

// The event-details card must look identical in every email: same title, same
// labels, same row order. Templates pass whichever fields they have; missing
// fields drop their row without changing the layout of the rest.
export interface EventDetails {
  venueName?: string;
  venueAddress?: string;
  dayOfWeek?: string;
  date?: string;
  hours?: string;
  eventPurpose?: string;
  eventType?: string;
  priceListed?: string;
  priceFinal?: string;
  cancellationReason?: string;
  notes?: string;
}

export function eventDetailsCard(d: EventDetails): string {
  return detailsCard("פרטי האירוע", [
    row("אולם", d.venueName),
    row("כתובת", d.venueAddress),
    row("תאריך", d.dayOfWeek && d.date ? `${d.dayOfWeek}, ${d.date}` : d.date),
    row("שעות", d.hours, { ltr: true }),
    row("מהות האירוע", d.eventPurpose),
    row("סוג האירוע", d.eventType),
    row("מחיר מחירון", d.priceListed),
    row("מחיר סופי", d.priceFinal),
    row("סיבת הביטול", d.cancellationReason),
    row("הערות", d.notes),
  ].join(""));
}

const TONES = {
  green: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
  amber: { bg: "#fef3c7", border: "#fcd34d", color: "#92400e" },
  gray: { bg: "#f9fafb", border: "#e5e7eb", color: "#374151" },
} as const;

// Callers escape any user data they interpolate into `html`.
export function infoBox(html: string, tone: keyof typeof TONES): string {
  const t = TONES[tone];
  return `<div style="background:${t.bg};border:1px solid ${t.border};border-radius:6px;padding:14px 16px;margin:20px 0;font-size:14px;line-height:1.6;color:${t.color};text-align:right;">${html}</div>`;
}

// "אל יוסי בטלפון 050…" / "אל יוסי" / "לאולם בטלפון 050…" / "לאולם",
// for use inside a לפנות/פנו sentence. Degrades per missing field.
export function contactTarget(name?: string | null, phone?: string | null): string {
  const n = name ? escapeHtml(name) : "";
  const ph = phone ? ltrSpan(phone) : "";
  if (n && ph) return `אל ${n} בטלפון ${ph}`;
  if (n) return `אל ${n}`;
  if (ph) return `לאולם בטלפון ${ph}`;
  return `לאולם`;
}

export function signoff(team: string): string {
  return `<p style="${TEXT}margin:24px 0 0;">בברכה,<br>צוות ${escapeHtml(team)}</p>`;
}
