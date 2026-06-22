import { escapeHtml } from "../escapeHtml";

interface ClientConfirmData {
  clientName: string;
  venueName: string;
  date: string;
  dayOfWeek: string;
  hoursLabel?: string;
  eventType: string;
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

export function clientConfirmHtml(d: ClientConfirmData): string {
  const row = (label: string, value?: string) =>
    `<li><strong>${label}:</strong> ${escapeHtml(value)}</li>`;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; direction: rtl; text-align: right; }
  .container { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 8px; padding: 32px 36px; border: 1px solid #e5e7eb; }
  h2 { font-size: 18px; color: #111; margin: 0 0 20px; }
  p { font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 12px; }
  ul { list-style: disc; padding-right: 20px; margin: 0 0 20px; }
  ul li { font-size: 14px; color: #374151; line-height: 1.8; }
  .closing { font-size: 14px; color: #374151; line-height: 1.7; margin-top: 24px; }
  .footer { font-size: 13px; color: #6b7280; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px; }
</style></head>
<body>
<div class="container">
  <h2>אישור הזמנה - אולם ${escapeHtml(d.venueName)}</h2>
  <p>שלום ${escapeHtml(d.clientName)},</p>
  <p>תודה שבחרתם לקיים את האירוע שלכם באולם ${escapeHtml(d.venueName)}.</p>
  <p>הזמנתכם התקבלה בהצלחה ונשמרה במערכת.</p>
  <p><strong>פרטי ההזמנה:</strong></p>
  <ul>
    ${row("תאריך האירוע", d.date)}
    ${row("יום בשבוע", d.dayOfWeek)}
    ${d.hoursLabel ? row("שעת האירוע", d.hoursLabel) : row("שעת האירוע")}
    ${row("סוג האירוע", d.eventType)}
    ${row("איש קשר באולם", d.contactName)}
    ${row("טלפון ליצירת קשר", d.contactPhone)}
    ${row("הערות", d.notes)}
  </ul>
  <div class="closing">
    <p>במידה ונדרש עדכון או שינוי בפרטי ההזמנה, ניתן ליצור קשר עם האולם באמצעות פרטי הקשר המופיעים לעיל.</p>
    <p>מאחלים לכם הרבה מזל טוב והצלחה בהכנות לאירוע, ושנזכה להיפגש בשמחות.</p>
    <p>בברכה,</p>
  </div>
  <div class="footer">
    EazyPlans<br>מערכת ניהול והזמנת אירועים
  </div>
</div>
</body></html>`;
}
