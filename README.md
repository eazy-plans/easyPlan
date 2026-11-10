This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environments

Development/testing and production must never share a Supabase project, keys,
or permissions. Each environment below needs its own Supabase project and its
own Resend key.

| Variable | Where it comes from | Shared across envs? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project Settings > API | No - one per project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project Settings > API | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project Settings > API | No - never client-exposed |
| `RESEND_API_KEY` | Resend dashboard | No - separate key or sandbox mode per env |
| `RESEND_FROM_EMAIL` / `RESEND_REPLY_TO` | Your domain / inbox | Can differ per env |
| `CRON_SECRET` | Generate yourself (e.g. `openssl rand -hex 32`) | No - separate per env |

### Setting up a dev/test environment

1. Create a **new, separate Supabase project** for development (Supabase
   dashboard > New Project). Do not reuse the production project.
2. Copy `.env.example` to `.env.local` and fill in the new project's URL,
   anon key, and service role key from its Settings > API page.
3. Apply the schema to the new project with the Supabase CLI:
   ```bash
   supabase init          # first time only, generates supabase/config.toml
   supabase link --project-ref <your-dev-project-ref>
   supabase db push       # applies everything in supabase/migrations/
   ```
   Or, for a fully local database instead of a hosted dev project:
   `supabase start` followed by `supabase db reset` (applies migrations and
   seed data automatically).
4. Load dummy data: run `supabase/seed.sql` against the dev project (via the
   Supabase SQL editor, or `psql "$DATABASE_URL" -f supabase/seed.sql` after
   linking). It creates one admin, one secretary, and one venue_owner test
   login, plus a sample venue and lead - never copy production data into dev.
5. Use a separate Resend API key (or Resend's sandbox/test mode) so dev
   never emails real customers, and a separate `CRON_SECRET`.
6. In your hosting platform, set Preview and Production environment
   variables separately - Preview should point at the dev Supabase project,
   Production at the production one. Never let the same key pair serve both.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
