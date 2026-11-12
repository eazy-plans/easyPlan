# Secrets Register & Rotation Policy

Regulatory basis: Israeli Privacy Protection Regulations (Data Security),
2017, Regulations 8 and 14 — periodic rotation of every secret, immediate
rotation on staff departure or suspected exposure, and a register of the
active secrets and their owners.

This document records secret **names** and metadata only. It never records
secret **values** — those live only in the Supabase dashboard, the Resend
dashboard, and each environment's variables in the Vercel dashboard.

## Scope

Mapped by variable name from `.env.example` and a repo-wide search for
`process.env.*` (the two match exactly — nothing else reads a secret from
the environment).

| Variable | Secret? | Where defined |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** — server-only, bypasses Row Level Security | Supabase dashboard > Project Settings > API |
| `RESEND_API_KEY` | **Yes** — authorizes sending email as the verified domain | Resend dashboard > API Keys |
| `CRON_SECRET` | **Yes** — bearer token gating `/api/cron/*` routes | Generated manually (`openssl rand -hex 32`), stored in Vercel env vars |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public by design — shipped to the browser, access is enforced by RLS, not by keeping this value secret | Supabase dashboard > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_URL` | Not a secret — a public project identifier | Supabase dashboard > Project Settings > API |
| `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO` | Not secrets — configuration (email addresses) | Set per environment |

Not applicable to this app:

- **JWT signing secret** — Supabase issues and verifies its own JWTs
  internally; this app never holds Supabase's JWT-signing key as an
  environment variable. (The service-role key above is itself a JWT, but
  the key used to *sign* new tokens is Supabase-managed and only rotatable
  from Project Settings > API > JWT Keys if Supabase ever requires it.)
- **Webhook-signing secret** — no incoming webhook is verified by a
  signature in this codebase today. If a Resend webhook (e.g. delivery
  status callbacks) is added later, its signing secret must be added as a
  new row in this register at that time.
- **Additional API keys** — none. Geocoding uses Nominatim/OpenStreetMap,
  which requires no API key. There is no Google Maps key (removed from the
  project; see venue-map history).

Each of dev, preview, and production has its **own** separate value for
every secret row above (see README.md "Environments") — this register
describes the variable itself, not any one environment's value.

## Register

| Secret | Owner (holds dashboard access) | Last rotated | Rotation frequency |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `[TO FILL IN: name]` | `[TO FILL IN: date, or "unknown — predates this register"]` | 12 months |
| `RESEND_API_KEY` | `[TO FILL IN: name]` | `[TO FILL IN: date, or "unknown — predates this register"]` | 12 months |
| `CRON_SECRET` | `[TO FILL IN: name]` | `[TO FILL IN: date, or "unknown — predates this register"]` | 12 months |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[TO FILL IN: name]` | `[TO FILL IN: date, or "unknown — predates this register"]` | 12 months (lower urgency — public by design, but kept on the same schedule for hygiene) |

Whoever updates a row here is expected to also update the "Last rotated"
date at the time of the actual rotation — this file does not update itself.

## Periodic rotation procedure (scheduled, no urgency)

Rotate the value **before** the 12-month deadline, in this order, per
environment (dev, preview, production handled as separate exercises — never
share a value across them):

1. Issue a **new** value in the provider dashboard (Supabase / Resend)
   without deleting the old one yet — most providers let both be valid
   briefly.
2. Update the corresponding Vercel environment variable for that specific
   environment (`vercel env` or the dashboard), then redeploy.
3. Confirm the app still works with the new value (login, a test booking
   email, the cron endpoint if `CRON_SECRET` was rotated).
4. Only after step 3 passes, revoke/delete the **old** value in the
   provider dashboard.
5. Record the new "Last rotated" date in the Register table above.

## Immediate rotation procedure (staff departure or suspected exposure)

Do not wait for the scheduled window or for step-by-step confirmation at
each stage — exposure risk outweighs the risk of a short service blip.

1. **Rotate first, fix deployment second.** Issue a new value and revoke
   the old one immediately in the provider dashboard, even before the new
   value is deployed anywhere — a few minutes of the app being degraded is
   preferable to a known-compromised secret staying live.
2. Update the Vercel environment variable(s) for every environment that
   used the exposed value, and redeploy.
3. Confirm the app works again (same checks as step 3 above).
4. Record the incident date and reason in the Register table's "Last
   rotated" column (e.g. "2026-11-10 — rotated early, departure of X").
5. If the exposure may have been used (e.g. a committed secret, a leaked
   log, a departing employee with copy access), also review Supabase Auth
   logs / Resend send history / recent audit_log entries from around the
   exposure window for anything unexpected.

This applies whenever someone who held access to a dashboard above leaves
their role, and whenever any secret is suspected to have been exposed
(committed to git, pasted somewhere, shown in a log, etc. — see the
verification step below).

## Verification performed for this change (read-only, no values touched)

- Searched the current working tree for hardcoded secrets outside
  `process.env.*` — none found.
- Searched the full `git log -p` history for the exact variable
  assignments above — every historical occurrence of
  `SUPABASE_SERVICE_ROLE_KEY=`, `RESEND_API_KEY=`, `CRON_SECRET=`, and the
  `NEXT_PUBLIC_*` variables is the empty placeholder from `.env.example`;
  no real value was ever committed.
- Searched the same history for generic secret shapes (JWT `eyJ...`,
  Resend `re_...`, AWS `AKIA...`, PEM private-key headers, Supabase
  `sbp_`/`sb_secret_` prefixes) — the only `eyJ`-like hits were npm
  `sha512-...` integrity hashes in `package-lock.json` that coincidentally
  contain that substring; they are not tokens.
- Confirmed `.gitignore` already excludes `.env*` except `.env.example`
  (no change needed).

## Open items (require a manual decision or action, not covered by this change)

- Fill in the actual owner name(s) above — i.e. who currently holds
  Supabase/Resend/Vercel dashboard access for each secret.
- Fill in each secret's actual last-rotation date, or confirm it predates
  this register and should be rotated now to start the 12-month clock.
- Decide on a notification channel for "a secret may have leaked" reports
  (e.g. Slack, email) — not configured here.
- Perform the actual first rotation of each secret per the procedure
  above — this document defines the policy and procedure; it does not
  rotate anything.
