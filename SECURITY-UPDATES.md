# Security Update Process

This document defines how dependency security updates are tracked and remediated for this repository.

## Owner

`[TO FILL IN: name]` is responsible for triaging Dependabot alerts, assigning fixes, and keeping the SLA table below up to date.

## Remediation deadlines by severity

Deadlines are measured from the vulnerability's public disclosure date (the date on the advisory / Dependabot alert), not from the date it is noticed.

| Severity | Deadline to install a fix |
|----------|---------------------------|
| Critical | 3 days |
| High     | 14 days |
| Medium   | 30 days |
| Low      | Next quarterly maintenance window |

## Tooling

- **Dependabot version updates** are configured in [`.github/dependabot.yml`](.github/dependabot.yml) for the `npm` ecosystem, running weekly, with patch and minor updates grouped into a single pull request.
- **Dependabot alerts** and **Dependabot security updates** must also be enabled in the repository's GitHub settings (Settings → Code security). This is a one-time manual step in the GitHub UI and is not controlled by a file in this repo — see "Open items" below.

## Documentation process

Every vulnerability that requires action gets one GitHub Issue, created from the [`security-update`](.github/ISSUE_TEMPLATE/security-update.md) issue template, recording:

- Package name
- Severity
- Published date
- Deadline (published date + SLA from the table above)
- Installed date (filled in when the fix is merged and deployed)

The issue stays open until the installed date is recorded and the fix is live in production.

## Open items (require a manual decision or action, not covered by this change)

- Fill in the actual owner's name above.
- Enable "Dependabot alerts" and "Dependabot security updates" in the repository's GitHub settings.
- Decide whether/how the owner is notified of new alerts (e.g. GitHub notifications, Slack, email) — not configured here.
