import { escapeHtml } from "../escapeHtml";
import { contactTarget, emailShell, eventDetailsCard, heading, infoBox, p, signoff } from "./layout";

interface ReminderData {
  clientName: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  date: string;
  dayOfWeek: string;
  eventType: string;
  hoursStart?: string;
  hoursEnd?: string;
  contactName?: string;
  contactPhone?: string;
  parkingInfo?: string;
  publicTransportInfo?: string;
}

export function reminderHtml(d: ReminderData): string {
  const hours = d.hoursStart && d.hoursEnd ? `${d.hoursStart} - ${d.hoursEnd}` : undefined;
  const address = [d.venueAddress, d.venueCity].filter(Boolean).join(", ");
  return emailShell(`
${heading("תזכורת - האירוע שלכם מחר")}
${p(`שלום ${escapeHtml(d.clientName)},`)}
${p(`מחר מתקיים האירוע שלכם באולם ${escapeHtml(d.venueName)}. ריכזנו עבורכם את כל הפרטים החשובים:`)}
${eventDetailsCard({
  venueName: d.venueName,
  venueAddress: address,
  dayOfWeek: d.dayOfWeek,
  date: d.date,
  hours,
  eventType: d.eventType,
})}
${d.parkingInfo ? infoBox(`<strong>חנייה:</strong><br>${escapeHtml(d.parkingInfo)}`, "gray") : ""}
${d.publicTransportInfo ? infoBox(`<strong>תחבורה ציבורית:</strong><br>${escapeHtml(d.publicTransportInfo)}`, "gray") : ""}
${p(`לשאלות או תיאומים של הרגע האחרון, ניתן לפנות ${contactTarget(d.contactName, d.contactPhone)}.`)}
${p("מאחלים לכם אירוע מוצלח ומרגש!")}
${signoff(d.venueName)}`);
}
