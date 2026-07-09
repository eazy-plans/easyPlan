---
name: verify
description: Drive the running Eazyplans app in a real browser as the existing admin to verify UI changes end-to-end.
---

# Verifying Eazyplans changes

## Handle

- The user's dev server is already running on **port 3000** (Next 16 refuses a second dev server for the same dir — never start your own; check with `Test-NetConnection localhost -Port 3000`).
- **Playwright is installed** in the project with chromium browsers present under `%LOCALAPPDATA%\ms-playwright`.
- Scripts outside the project dir can't resolve project packages — use `createRequire("C:/Users/HP/Desktop/Eazyplans/package.json")` in an `.mjs` script.

## Auth (no test users — use the existing admin)

Creating Supabase test users via service-role key is permission-denied; don't try. Instead mint a session for the existing admin:

1. Service-role client → `from("users").select("email").eq("role","admin").limit(1)`.
2. `admin.auth.admin.generateLink({ type: "magiclink", email })` → `data.properties.hashed_token`.
3. Anon client → `auth.verifyOtp({ type: "magiclink", token_hash })` → session.
4. `createServerClient` from `@supabase/ssr` with a Map-backed `{ getAll, setAll }` cookie jar → `auth.setSession({ access_token, refresh_token })` — the jar now holds the exact `sb-*` cookie(s) the Next app expects (usually 1 chunk).
5. Playwright: `context.addCookies([{ name, value, url: "http://localhost:3000/" }])`, then `page.goto(...)`.

**Never print tokens or cookie values to output** — the output classifier blocks the whole result.

## Drive & observe

- Wait `networkidle` plus ~1s for client-only panels (`dynamic({ssr:false})` — dashboard stats etc. are not in server HTML).
- Collect `page.on("console")` / `page.on("pageerror")` — server component errors stream to the browser console in dev.
- Full-page screenshots to the scratchpad; the black "N" circle bottom-left is the Next dev-tools badge, not app UI.
- Server logs: `.next/dev/logs/next-development.log` (JSON lines). Real 404s show digest `NEXT_HTTP_ERROR_FALLBACK;404`, not the "This page could not be found" string (always present in dev HTML).

## Gotchas

- App is Hebrew RTL — assert on Hebrew strings.
- Role access: admin has /events, /leads, /venues, /settings (no /calendar); venue_owner has /dashboard, /calendar, /venues only; secretary is redirected off /dashboard.
