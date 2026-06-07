interface WaitlistNotifyData {
  clientName: string;
  venueName: string;
  date: string;
}

export function waitlistNotifyHtml(d: WaitlistNotifyData): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; direction: rtl; text-align: right; }
  .container { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb; direction: rtl; text-align: right; }
  h1 { font-size: 20px; color: #111; margin-bottom: 16px; }
  .highlight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 15px; color: #166534; }
  .footer { font-size: 12px; color: #9ca3af; margin-top: 24px; }
</style></head>
<body>
<div class="container">
  <h1>תאריך התפנה - ${d.venueName}</h1>
  <p style="font-size:14px;">שלום ${d.clientName},</p>
  <p style="font-size:14px;">בשורות טובות! תאריך שהמתנת לו התפנה:</p>
  <div class="highlight">
    <strong>${d.venueName}</strong> - ${d.date}
  </div>
  <p style="font-size:14px;">צור/י קשר בהקדם כדי לשריין את התאריך לפני שיתפס.</p>
  <div class="footer">Eazyplans - מערכת ניהול אולמות</div>
</div>
</body></html>`;
}
