interface OwnerEventCreatedData {
  venueName: string;
  date: string;
  eventType: string;
  eventPurpose: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  priceListed: string;
  priceFinal: string;
  notes?: string;
}

export function ownerEventCreatedHtml(d: OwnerEventCreatedData): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; direction: rtl; text-align: right; }
  .container { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb; direction: rtl; text-align: right; }
  h1 { font-size: 20px; color: #111; margin-bottom: 8px; }
  .badge { display: inline-block; background: #d1fae5; color: #065f46; border-radius: 4px; padding: 2px 10px; font-size: 13px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
  td:first-child { color: #6b7280; width: 40%; }
  td:last-child { font-weight: 600; }
  .note { background: #f9fafb; border-radius: 6px; padding: 12px; font-size: 13px; color: #374151; }
  .footer { font-size: 12px; color: #9ca3af; margin-top: 24px; }
</style></head>
<body>
<div class="container">
  <h1>אירוע חדש נרשם - ${d.venueName}</h1>
  <span class="badge">אושר</span>
  <table>
    <tr><td>תאריך</td><td>${d.date}</td></tr>
    <tr><td>סוג אירוע</td><td>${d.eventType}</td></tr>
    <tr><td>מהות האירוע</td><td>${d.eventPurpose}</td></tr>
    <tr><td>שם הלקוח</td><td>${d.clientName}</td></tr>
    <tr><td>טלפון</td><td dir="ltr">${d.clientPhone}</td></tr>
    <tr><td>מייל</td><td dir="ltr">${d.clientEmail}</td></tr>
    <tr><td>מחיר מחירון</td><td>${d.priceListed}</td></tr>
    <tr><td>מחיר סופי</td><td>${d.priceFinal}</td></tr>
  </table>
  ${d.notes ? `<div class="note"><strong>הערות:</strong> ${d.notes}</div>` : ""}
  <div class="footer">Eazyplans - מערכת ניהול אולמות</div>
</div>
</body></html>`;
}
