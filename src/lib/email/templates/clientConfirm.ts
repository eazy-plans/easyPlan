import { escapeHtml } from "../escapeHtml";
import { contactTarget, emailShell, eventDetailsCard, heading, p, signoff } from "./layout";

interface ClientConfirmData {
  clientName: string;
  venueName: string;
  venueAddress?: string;
  date: string;
  dayOfWeek: string;
  hoursLabel?: string;
  eventType: string;
  eventPurpose?: string;
  price?: string;
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

export function clientConfirmHtml(d: ClientConfirmData): string {
  return emailShell(`
${heading("ההזמנה שלכם אושרה")}
${p(`שלום ${escapeHtml(d.clientName)},`)}
${p(`שמחים לבשר שההזמנה שלכם באולם ${escapeHtml(d.venueName)} אושרה, והתאריך שמור עבורכם.`)}
${eventDetailsCard({
  venueName: d.venueName,
  venueAddress: d.venueAddress,
  dayOfWeek: d.dayOfWeek,
  date: d.date,
  hours: d.hoursLabel,
  eventPurpose: d.eventPurpose,
  eventType: d.eventType,
  priceFinal: d.price,
  notes: d.notes,
})}
${p(`לכל שאלה, עדכון או שינוי בפרטי ההזמנה, ניתן לפנות ${contactTarget(d.contactName, d.contactPhone)}.`)}
${p("מאחלים לכם הכנות נעימות והמון מזל טוב — נתראה בשמחות!")}
${signoff(d.venueName)}`);
}
