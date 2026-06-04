interface ReminderData {
  clientName: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  date: string;
  eventType: string;
  hoursStart?: string;
  hoursEnd?: string;
  parkingInfo?: string;
  publicTransportInfo?: string;
}

export function reminderHtml(d: ReminderData): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; direction: rtl; text-align: right; }
  .container { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb; direction: rtl; text-align: right; }
  h1 { font-size: 20px; color: #111; margin-bottom: 8px; }
  .badge { display: inline-block; background: #ede9fe; color: #5b21b6; border-radius: 4px; padding: 2px 10px; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
  td:first-child { color: #6b7280; width: 40%; }
  td:last-child { font-weight: 600; }
  .section { margin-top: 16px; font-size: 13px; color: #374151; }
  .section h3 { font-size: 14px; margin-bottom: 4px; color: #111; }
  .footer { font-size: 12px; color: #9ca3af; margin-top: 24px; }
</style></head>
<body>
<div class="container">
  <h1>תזכורת — האירוע שלך מחר</h1>
  <span class="badge">מחר!</span>
  <p style="font-size:14px;margin-bottom:20px;">שלום ${d.clientName}, תזכורת לאירוע שלך מחר ב${d.venueName}.</p>
  <table>
    <tr><td>אולם</td><td>${d.venueName}</td></tr>
    <tr><td>כתובת</td><td>${d.venueAddress}, ${d.venueCity}</td></tr>
    <tr><td>תאריך</td><td>${d.date}</td></tr>
    <tr><td>סוג אירוע</td><td>${d.eventType}</td></tr>
    ${d.hoursStart && d.hoursEnd ? `<tr><td>שעות</td><td dir="ltr">${d.hoursStart} — ${d.hoursEnd}</td></tr>` : ""}
  </table>
  ${d.parkingInfo ? `<div class="section"><h3>חנייה</h3><p>${d.parkingInfo}</p></div>` : ""}
  ${d.publicTransportInfo ? `<div class="section"><h3>תחבורה ציבורית</h3><p>${d.publicTransportInfo}</p></div>` : ""}
  <div class="footer">Eazyplans - מערכת ניהול אולמות</div>
</div>
</body></html>`;
}
