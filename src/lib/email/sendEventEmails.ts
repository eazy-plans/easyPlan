import { sendEmail } from "./resend";
import { ownerEventCreatedHtml } from "./templates/ownerEventCreated";
import { clientConfirmHtml } from "./templates/clientConfirm";
import { waitlistNotifyHtml } from "./templates/waitlistNotify";
import { eventCancelledHtml } from "./templates/eventCancelled";
import { EVENT_TYPE_LABELS, EVENT_PURPOSE_LABELS } from "@/types/booking";
import { formatCurrency } from "@/lib/utils";
import type { EventRow, VenueRow } from "@/types/database";

// event.date is a date-only string ("YYYY-MM-DD"). Parse the components
// instead of new Date(dateStr): the latter parses as UTC midnight, which
// formats as the previous day on servers west of UTC.
function parseDateOnly(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateHe(dateStr: string) {
  return parseDateOnly(dateStr).toLocaleDateString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function formatDayOfWeekHe(dateStr: string) {
  return parseDateOnly(dateStr).toLocaleDateString("he-IL", { weekday: "long" });
}

const HOURS_MAP = {
  morning: ["hours_morning_start", "hours_morning_end"],
  evening: ["hours_evening_start", "hours_evening_end"],
  full_day: ["hours_full_start", "hours_full_end"],
  shabbat: ["hours_shabbat_start", "hours_shabbat_end"],
} as const;

type VenueHourFields = Pick<
  VenueRow,
  | "hours_morning_start" | "hours_morning_end"
  | "hours_evening_start" | "hours_evening_end"
  | "hours_full_start" | "hours_full_end"
  | "hours_shabbat_start" | "hours_shabbat_end"
>;

export async function sendWaitlistNotifyEmail(
  clientEmail: string,
  clientName: string,
  venueName: string,
  dateStr: string,
  contact?: { name?: string | null; phone?: string | null },
) {
  const date = formatDateHe(dateStr);
  const html = waitlistNotifyHtml({
    clientName,
    venueName,
    date,
    dayOfWeek: formatDayOfWeekHe(dateStr),
    contactName: contact?.name ?? undefined,
    contactPhone: contact?.phone ?? undefined,
  });
  return sendEmail({
    to: clientEmail,
    subject: `תאריך התפנה - ${venueName} - ${date}`,
    html,
  });
}



export async function sendOwnerEventCreatedEmail(
  event: Pick<EventRow, "date" | "event_type" | "event_purpose" | "client_name" | "client_phone" | "client_email" | "price_listed" | "price_final" | "notes">,
  venue: Pick<VenueRow, "name">,
  ownerEmail: string,
  ownerName?: string,
) {
  const html = ownerEventCreatedHtml({
    venueName: venue.name,
    ownerName,
    date: formatDateHe(event.date),
    dayOfWeek: formatDayOfWeekHe(event.date),
    eventType: EVENT_TYPE_LABELS[event.event_type] ?? event.event_type,
    eventPurpose: EVENT_PURPOSE_LABELS[event.event_purpose] ?? event.event_purpose,
    clientName: event.client_name,
    clientPhone: event.client_phone,
    clientEmail: event.client_email ?? undefined,
    priceListed: formatCurrency(event.price_listed),
    priceFinal: formatCurrency(event.price_final),
    notes: event.notes ?? undefined,
  });

  return sendEmail({
    to: ownerEmail,
    subject: `אירוע חדש נרשם - ${venue.name} - ${formatDateHe(event.date)}`,
    html,
  });
}


export async function sendClientConfirmEmail(
  event: Pick<EventRow, "date" | "event_type" | "event_purpose" | "client_name" | "client_email" | "price_final" | "notes">,
  venue: Pick<VenueRow, "name" | "address" | "city" | "contact_name" | "contact_phone"> & VenueHourFields,
) {
  if (!event.client_email) return;
  const [startKey, endKey] = HOURS_MAP[event.event_type];
  const hoursStart = String(venue[startKey] ?? "").slice(0, 5) || undefined;
  const hoursEnd = String(venue[endKey] ?? "").slice(0, 5) || undefined;
  const hoursLabel = hoursStart && hoursEnd ? `${hoursStart} - ${hoursEnd}` : undefined;

  const html = clientConfirmHtml({
    clientName: event.client_name,
    venueName: venue.name,
    venueAddress: [venue.address, venue.city].filter(Boolean).join(", ") || undefined,
    date: formatDateHe(event.date),
    dayOfWeek: formatDayOfWeekHe(event.date),
    hoursLabel,
    eventType: EVENT_TYPE_LABELS[event.event_type] ?? event.event_type,
    eventPurpose: EVENT_PURPOSE_LABELS[event.event_purpose] ?? event.event_purpose,
    price: formatCurrency(event.price_final),
    contactName: venue.contact_name ?? undefined,
    contactPhone: venue.contact_phone ?? undefined,
    notes: event.notes ?? undefined,
  });

  return sendEmail({
    to: event.client_email,
    subject: `אישור הזמנה - אולם ${venue.name} - ${formatDateHe(event.date)}`,
    html,
  });
}

export async function sendCancellationEmail(
  event: Pick<EventRow, "date" | "event_type" | "event_purpose" | "client_name" | "client_email" | "price_final" | "original_price_final">,
  venue: Pick<VenueRow, "name" | "cancellation_policy" | "contact_name" | "contact_phone"> & { owner?: { full_name: string } | null },
  cancellationReason?: string
) {
  if (!event.client_email) return;

  const html = eventCancelledHtml({
    clientName: event.client_name,
    venueName: venue.name,
    date: formatDateHe(event.date),
    dayOfWeek: formatDayOfWeekHe(event.date),
    eventType: EVENT_TYPE_LABELS[event.event_type] ?? event.event_type,
    eventPurpose: EVENT_PURPOSE_LABELS[event.event_purpose] ?? event.event_purpose,
    originalPrice: formatCurrency(event.original_price_final ?? event.price_final),
    policyDescription: venue.cancellation_policy || undefined,
    cancellationReason,
    contactName: venue.contact_name ?? venue.owner?.full_name,
    contactPhone: venue.contact_phone ?? undefined,
  });

  return sendEmail({
    to: event.client_email,
    subject: `הודעת ביטול הזמנה - אולם ${venue.name} - ${formatDateHe(event.date)}`,
    html,
  });
}
