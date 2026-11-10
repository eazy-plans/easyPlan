import { sendEmail } from "./resend";
import { securityAlertHtml, type SecurityAlertRow } from "./templates/securityAlert";

/**
 * Sends a security-alert email to SECURITY_ALERT_EMAIL (reg. 10). Best-effort:
 * never throws, so a notification failure can never break the action that
 * triggered it (role change, block/unblock, login-failure threshold, daily
 * digest). Rows must never contain customer data - only event type, account,
 * timestamp and counts.
 */
export async function sendSecurityAlert(opts: { heading: string; intro: string; rows: SecurityAlertRow[] }) {
  const to = process.env.SECURITY_ALERT_EMAIL;
  if (!to) {
    console.error(`SECURITY_ALERT_EMAIL is not configured - security alert not sent: ${opts.heading}`);
    return;
  }
  try {
    await sendEmail({
      to,
      subject: `התראת אבטחה - ${opts.heading}`,
      html: securityAlertHtml(opts),
    });
  } catch (err) {
    console.error("sendSecurityAlert failed:", err);
  }
}
