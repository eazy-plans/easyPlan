/* eslint-disable @typescript-eslint/no-explicit-any */
import { resend } from "./resend";
import { ownerRequestHtml } from "./templates/ownerRequest";
import { clientConfirmHtml } from "./templates/clientConfirm";
import { waitlistNotifyHtml } from "./templates/waitlistNotify";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS } from "@/types/booking";
import { formatCurrency } from "@/lib/utils";

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@eazyplans.co.il";

function formatDateHe(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
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
    to: clientEmail,
    subject: `תאריך התפנה — ${venueName} — ${date}`,
    html,
  });
}


export async function sendOwnerRequestEmail(event: any, venue: any, ownerEmail: string) {
  const [startKey, endKey] = HOURS_MAP[event.event_type] ?? [];
  const html = ownerRequestHtml({
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
    to: ownerEmail,
    subject: `בקשת הזמנה חדשה — ${venue.name} — ${formatDateHe(event.date)}`,
    html,
  });
}


export async function sendClientConfirmEmail(event: any, venue: any) {
  if (!event.client_email) return;
  const [startKey, endKey] = HOURS_MAP[event.event_type] ?? [];
  const hoursStart = startKey ? String(venue[startKey] ?? "").slice(0, 5) : undefined;
  const hoursEnd = endKey ? String(venue[endKey] ?? "").slice(0, 5) : undefined;

  const html = clientConfirmHtml({
    clientName: event.client_name,
    venueName: venue.name,
    venueAddress: venue.address,
    venueCity: venue.city,
    date: formatDateHe(event.date),
    eventType: EVENT_TYPE_LABELS[event.event_type as keyof typeof EVENT_TYPE_LABELS] ?? event.event_type,
    hoursStart,
    hoursEnd,
    priceFinal: formatCurrency(event.price_final),
    parkingInfo: venue.parking_info,
    publicTransportInfo: venue.public_transport_info,
  });

  return resend.emails.send({
    from: FROM,
    to: event.client_email,
    subject: `האירוע שלך אושר — ${venue.name}`,
    html,
  });
}
