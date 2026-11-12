import { detailsCard, emailShell, heading, p, row } from "./layout";

// One finding in a security alert: who/what/when, no customer data.
export interface SecurityAlertRow {
  title: string;
  account?: string;
  detail?: string;
  occurredAt: string;
}

export function securityAlertHtml(opts: { heading: string; intro: string; rows: SecurityAlertRow[] }): string {
  const cards = opts.rows.map((r) =>
    detailsCard(r.title, [
      row("חשבון", r.account),
      row("פרטים", r.detail),
      row("מועד", r.occurredAt, { ltr: true }),
    ].join(""))
  ).join("");

  return emailShell(`
${heading(opts.heading, "#b45309")}
${p(opts.intro)}
${cards}`);
}
