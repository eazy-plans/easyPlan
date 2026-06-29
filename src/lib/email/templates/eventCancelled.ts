import { escapeHtml } from "../escapeHtml";

interface EventCancelledData {
  clientName: string;
  venueName: string;
  date: string;
  dayOfWeek: string;
  eventType: string;
  originalPrice: string;
  refundAmount: string;
  refundDeadline?: string;
  policyType: string;
  policyDescription: string;
  cancellationReason?: string;
  contactName?: string;
  contactPhone?: string;
}

export function eventCancelledHtml(d: EventCancelledData): string {
  const row = (label: string, value?: string) =>
    value ? `<li><strong>${label}:</strong> ${escapeHtml(value)}</li>` : "";

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; direction: rtl; text-align: right; }
  .container { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 8px; padding: 32px 36px; border: 1px solid #e5e7eb; }
  .alert { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 16px; margin: 20px 0; }
  .alert p { color: #92400e; margin: 0; }
  h2 { font-size: 18px; color: #dc2626; margin: 0 0 20px; }
  p { font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 12px; }
  ul { list-style: disc; padding-right: 20px; margin: 0 0 20px; }
  ul li { font-size: 14px; color: #374151; line-height: 1.8; }
  .refund-section { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 16px; margin: 20px 0; }
  .refund-section strong { color: #047857; }
  .closing { font-size: 14px; color: #374151; line-height: 1.7; margin-top: 24px; }
  .footer { font-size: 13px; color: #6b7280; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px; }
</style></head>
<body>
<div class="container">
  <h2>הודעת ביטול הזמנה - אולם ${escapeHtml(d.venueName)}</h2>

  <div class="alert">
    <p>⚠️ ההזמנה שלכם באולם ${escapeHtml(d.venueName)} בוטלה בהצלחה.</p>
  </div>

  <p>שלום ${escapeHtml(d.clientName)},</p>
  <p>זה לאשר כי ההזמנה שלכם בוטלה כמפורט להלן:</p>

  <p><strong>פרטי ההזמנה שבוטלה:</strong></p>
  <ul>
    ${row("תאריך האירוע", d.date)}
    ${row("יום בשבוע", d.dayOfWeek)}
    ${row("סוג האירוע", d.eventType)}
    ${row("אולם", d.venueName)}
  </ul>

  <div class="refund-section">
    <p><strong>🔄 פרטי ההחזר:</strong></p>
    <ul>
      ${row("מחיר המקורי", d.originalPrice)}
      ${row("סכום החזר", d.refundAmount)}
      ${d.refundDeadline ? row("תאריך עיבוד החזר", d.refundDeadline) : ""}
    </ul>
  </div>

  <p><strong>מדיניות הביטול:</strong></p>
  <p>${escapeHtml(d.policyDescription)}</p>

  ${
    d.cancellationReason
      ? `<p><strong>סיבת הביטול:</strong> ${escapeHtml(d.cancellationReason)}</p>`
      : ""
  }

  <p><strong>מה הלאה?</strong></p>
  <ul>
    <li>ההחזר יעובד תוך 7-10 ימי עסקים לחשבון הבנק שלכם</li>
    <li>לשאלות או בעיות, אנא צרו קשר עם האולם ישירות</li>
    ${d.contactName ? `<li>איש קשר: ${escapeHtml(d.contactName)}</li>` : ""}
    ${d.contactPhone ? `<li>טלפון: ${escapeHtml(d.contactPhone)}</li>` : ""}
  </ul>

  <div class="closing">
    <p>נשמח לעזור לכם בעתיד. אם תרצו לשוב לתכנן אירוע, אנא צרו קשר איתנו.</p>
    <p>בברכה,</p>
  </div>

  <div class="footer">
    EazyPlans<br>מערכת ניהול והזמנת אירועים
  </div>
</div>
</body></html>`;
}
