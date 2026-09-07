import { escapeHtml } from "../escapeHtml";
import { contactTarget, emailShell, eventDetailsCard, heading, infoBox, p, signoff } from "./layout";

interface EventReplacedData {
  clientName: string;
  venueName: string;
  date: string;
  dayOfWeek: string;
  eventType: string;
  eventPurpose?: string;
  originalPrice: string;
  policyDescription?: string;
  contactName?: string;
  contactPhone?: string;
}

// Sent to the client whose event carried cancellation_requested_at when a
// different client books the same slot - the system cancels their event
// automatically, so they need to hear it happened and why, same as any
// other cancellation notice.
export function eventReplacedHtml(d: EventReplacedData): string {
  return emailShell(`
${heading("ההזמנה שלכם בוטלה", "#dc2626")}
${p(`שלום ${escapeHtml(d.clientName)},`)}
${p(`ביקשתם לבטל את ההזמנה שלכם באולם ${escapeHtml(d.venueName)}, ולקוח אחר הזמין את התאריך במקומכם. בהתאם לבקשתכם, ההזמנה בוטלה סופית:`)}
${eventDetailsCard({
  venueName: d.venueName,
  dayOfWeek: d.dayOfWeek,
  date: d.date,
  eventPurpose: d.eventPurpose,
  eventType: d.eventType,
  priceFinal: d.originalPrice,
})}
${d.policyDescription ? infoBox(`<strong>מדיניות הביטול של האולם:</strong><br>${escapeHtml(d.policyDescription)}`, "amber") : ""}
${p("החזר כספי, ככל שמגיע, יטופל ישירות מול האולם בהתאם למדיניות הביטול.")}
${p(`לשאלות בנושא הביטול או ההחזר, ניתן לפנות ${contactTarget(d.contactName, d.contactPhone)}.`)}
${p("נשמח לארח אתכם בשמחות הבאות שלכם.")}
${signoff(d.venueName)}`);
}
