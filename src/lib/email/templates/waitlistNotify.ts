import { escapeHtml } from "../escapeHtml";
import { contactTarget, emailShell, eventDetailsCard, heading, p, signoff } from "./layout";

interface WaitlistNotifyData {
  clientName: string;
  venueName: string;
  date: string;
  dayOfWeek: string;
  contactName?: string;
  contactPhone?: string;
}

export function waitlistNotifyHtml(d: WaitlistNotifyData): string {
  return emailShell(`
${heading(`תאריך התפנה באולם ${d.venueName}`)}
${p(`שלום ${escapeHtml(d.clientName)},`)}
${p(`בשורות טובות! התאריך שהמתנתם לו באולם ${escapeHtml(d.venueName)} התפנה:`)}
${eventDetailsCard({
  venueName: d.venueName,
  dayOfWeek: d.dayOfWeek,
  date: d.date,
})}
${p(`כדי לשריין את התאריך לפני שייתפס, פנו בהקדם ${contactTarget(d.contactName, d.contactPhone)}.`)}
${p("נשמח לחגוג איתכם!")}
${signoff(d.venueName)}`);
}
