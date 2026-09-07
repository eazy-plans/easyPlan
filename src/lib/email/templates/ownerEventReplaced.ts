import { escapeHtml } from "../escapeHtml";
import { detailsCard, emailShell, eventDetailsCard, heading, p, row } from "./layout";

interface OwnerEventReplacedData {
  venueName: string;
  ownerName?: string;
  date: string;
  dayOfWeek: string;
  eventType: string;
  eventPurpose: string;
  previousClientName: string;
  newClientName: string;
  newClientPhone: string;
  newClientEmail?: string;
  priceFinal: string;
}

// Sent to the venue owner when a pending-cancellation event on their
// calendar gets automatically replaced by a new booking for the same
// slot - the only other cancellation email today (eventCancelled) never
// notifies the owner at all.
export function ownerEventReplacedHtml(d: OwnerEventReplacedData): string {
  return emailShell(`
${heading(`התאריך הוחלף בהזמנה חדשה - ${d.venueName}`)}
${p(`שלום${d.ownerName ? ` ${escapeHtml(d.ownerName)}` : ""},`)}
${p(`ההזמנה של ${escapeHtml(d.previousClientName)} באולם ${escapeHtml(d.venueName)} סומנה כממתינה לביטול, ולקוח אחר הזמין את אותו תאריך. ההזמנה הקודמת בוטלה אוטומטית וההזמנה החדשה אושרה במקומה:`)}
${eventDetailsCard({
  venueName: d.venueName,
  dayOfWeek: d.dayOfWeek,
  date: d.date,
  eventPurpose: d.eventPurpose,
  eventType: d.eventType,
  priceFinal: d.priceFinal,
})}
${detailsCard("פרטי הלקוח החדש", [
  row("שם", d.newClientName),
  row("טלפון", d.newClientPhone, { ltr: true }),
  row("מייל", d.newClientEmail, { ltr: true }),
].join(""))}
${p("האירוע מופיע ביומן האולם במערכת, שם ניתן לצפות בכל הפרטים ולעדכן אותם בכל עת.")}`);
}
