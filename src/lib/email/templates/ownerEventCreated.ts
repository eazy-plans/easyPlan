import { escapeHtml } from "../escapeHtml";
import { detailsCard, emailShell, eventDetailsCard, heading, p, row } from "./layout";

interface OwnerEventCreatedData {
  venueName: string;
  ownerName?: string;
  date: string;
  dayOfWeek: string;
  eventType: string;
  eventPurpose: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  priceListed: string;
  priceFinal: string;
  notes?: string;
}

export function ownerEventCreatedHtml(d: OwnerEventCreatedData): string {
  return emailShell(`
${heading(`אירוע חדש נרשם - ${d.venueName}`)}
<span style="display:inline-block;background:#d1fae5;color:#065f46;border-radius:4px;padding:2px 10px;font-size:13px;margin:0 0 16px;">אושר</span>
${p(`שלום${d.ownerName ? ` ${escapeHtml(d.ownerName)}` : ""},`)}
${p(`אירוע חדש נרשם ואושר באולם ${escapeHtml(d.venueName)}. ריכזנו עבורך את כל הפרטים:`)}
${eventDetailsCard({
  venueName: d.venueName,
  dayOfWeek: d.dayOfWeek,
  date: d.date,
  eventPurpose: d.eventPurpose,
  eventType: d.eventType,
  priceListed: d.priceListed,
  priceFinal: d.priceFinal,
  notes: d.notes,
})}
${detailsCard("פרטי הלקוח", [
  row("שם", d.clientName),
  row("טלפון", d.clientPhone, { ltr: true }),
  row("מייל", d.clientEmail, { ltr: true }),
].join(""))}
${p("האירוע מופיע ביומן האולם במערכת, שם ניתן לצפות בכל הפרטים ולעדכן אותם בכל עת.")}`);
}
