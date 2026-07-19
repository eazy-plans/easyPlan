import { escapeHtml } from "../escapeHtml";
import { contactTarget, emailShell, eventDetailsCard, heading, infoBox, p, signoff } from "./layout";

interface EventCancelledData {
  clientName: string;
  venueName: string;
  date: string;
  dayOfWeek: string;
  eventType: string;
  eventPurpose?: string;
  originalPrice: string;
  policyDescription?: string;
  cancellationReason?: string;
  contactName?: string;
  contactPhone?: string;
}

export function eventCancelledHtml(d: EventCancelledData): string {
  return emailShell(`
${heading("ההזמנה שלכם בוטלה", "#dc2626")}
${p(`שלום ${escapeHtml(d.clientName)},`)}
${p(`אנו מאשרים שההזמנה שלכם באולם ${escapeHtml(d.venueName)} בוטלה, כמפורט להלן:`)}
${eventDetailsCard({
  venueName: d.venueName,
  dayOfWeek: d.dayOfWeek,
  date: d.date,
  eventPurpose: d.eventPurpose,
  eventType: d.eventType,
  priceFinal: d.originalPrice,
  cancellationReason: d.cancellationReason,
})}
${d.policyDescription ? infoBox(`<strong>מדיניות הביטול של האולם:</strong><br>${escapeHtml(d.policyDescription)}`, "amber") : ""}
${p("החזר כספי, ככל שמגיע, יטופל ישירות מול האולם בהתאם למדיניות הביטול.")}
${p(`לשאלות בנושא הביטול או ההחזר, ניתן לפנות ${contactTarget(d.contactName, d.contactPhone)}.`)}
${p("נשמח לארח אתכם בשמחות הבאות שלכם.")}
${signoff(d.venueName)}`);
}
