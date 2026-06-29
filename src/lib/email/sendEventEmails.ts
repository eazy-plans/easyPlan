/* eslint-disable @typescript-eslint/no-explicit-any */
import { resend } from "./resend";
import { ownerEventCreatedHtml } from "./templates/ownerEventCreated";
import { clientConfirmHtml } from "./templates/clientConfirm";
import { waitlistNotifyHtml } from "./templates/waitlistNotify";
import { eventCancelledHtml } from "./templates/eventCancelled";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS } from "@/types/booking";
import { formatCurrency } from "@/lib/utils";

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const REPLY_TO = process.env.RESEND_REPLY_TO;

function formatDateHe(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatDayOfWeekHe(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("he-IL", { weekday: "long" });
}

const HOURS_MAP: Record<string, [string, string]> = {
  morning: ["hours_morning_start", "hours_morning_end"],
  evening: ["hours_evening_start", "hours_evening_end"],
  full_day: ["hours_full_start", "hours_full_end"],
  shabbat: ["hours_shabbat_start", "hours_shabbat_end"],
};

export async function sendWaitlistNotifyEmail(
  clientEmail: string,
  clientName: string,
  venueName: string,
  dateStr: string,
) {
  const date = new Date(dateStr).toLocaleDateString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const html = waitlistNotifyHtml({ clientName, venueName, date });
  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: clientEmail,
    subject: `תאריך התפנה - ${venueName} - ${date}`,
    html,
  });
}



export async function sendOwnerEventCreatedEmail(event: any, venue: any, ownerEmail: string) {
  const html = ownerEventCreatedHtml({
    venueName: venue.name,
    date: formatDateHe(event.date),
    eventType: EVENT_TYPE_LABELS[event.event_type as keyof typeof EVENT_TYPE_LABELS] ?? event.event_type,
    eventPurpose: EVENT_PURPOSE_LABELS[event.event_purpose as keyof typeof EVENT_PURPOSE_LABELS] ?? event.event_purpose,
    clientName: event.client_name,
    clientPhone: event.client_phone,
    clientEmail: event.client_email,
    priceListed: formatCurrency(event.price_listed),
    priceFinal: formatCurrency(event.price_final),
    notes: event.notes,
  });

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: ownerEmail,
    subject: `אירוע חדש נרשם - ${venue.name} - ${formatDateHe(event.date)}`,
    html,
  });
}


export async function sendClientConfirmEmail(event: any, venue: any) {
  if (!event.client_email) return;
  const [startKey, endKey] = HOURS_MAP[event.event_type] ?? [];
  const hoursStart = startKey ? String(venue[startKey] ?? "").slice(0, 5) : undefined;
  const hoursEnd = endKey ? String(venue[endKey] ?? "").slice(0, 5) : undefined;
  const hoursLabel = hoursStart && hoursEnd ? `${hoursStart} - ${hoursEnd}` : undefined;

  const html = clientConfirmHtml({
    clientName: event.client_name,
    venueName: venue.name,
    date: formatDateHe(event.date),
    dayOfWeek: formatDayOfWeekHe(event.date),
    hoursLabel,
    eventType: EVENT_TYPE_LABELS[event.event_type as keyof typeof EVENT_TYPE_LABELS] ?? event.event_type,
    contactName: venue.owner?.full_name,
    contactPhone: venue.owner?.phone,
    notes: event.notes,
  });

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: event.client_email,
    subject: `אישור הזמנה - אולם ${venue.name}`,
    html,
  });
}

export async function sendCancellationEmail(
  event: any,
  venue: any,
  refundAmount: number,
  cancellationReason?: string
) {
  if (!event.client_email) return;

  const policyDescriptions: Record<string, string> = {
    flexible: "מדיניות גמישה: החזר מלא אם מבוטל לפני תאריך הקבוע",
    moderate: "מדיניות מתונה: החזר בדרגות לפי מספר הימים לפני האירוע",
    strict: `מדיניות קשוחה: עמלה של ${venue.cancellation_fee_percent}%, החזר של היתרה עד לתאריך הקבוע`,
    custom: venue.refund_details || "מדיניות מותאמת אישית",
  };

  const html = eventCancelledHtml({
    clientName: event.client_name,
    venueName: venue.name,
    date: formatDateHe(event.date),
    dayOfWeek: formatDayOfWeekHe(event.date),
    eventType: EVENT_TYPE_LABELS[event.event_type as keyof typeof EVENT_TYPE_LABELS] ?? event.event_type,
    originalPrice: formatCurrency(event.original_price_final ?? event.price_final),
    refundAmount: formatCurrency(refundAmount),
    refundDeadline: event.refund_date ? formatDateHe(event.refund_date) : undefined,
    policyType: venue.cancellation_policy_type,
    policyDescription: policyDescriptions[venue.cancellation_policy_type] || "מדיניות מוגדרת",
    cancellationReason,
    contactName: venue.owner?.full_name,
    contactPhone: venue.owner?.phone,
  });

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: event.client_email,
    subject: `הודעת ביטול הזמנה - אולם ${venue.name}`,
    html,
  });
}
