# Periodic Restore Test

Regulatory basis: Israeli Privacy Protection Regulations (Data Security),
2017, Regulation 18 — periodic testing that backups can actually be
restored, with the test and its results documented.

## Current state (read this first)

The production Supabase project is on the **Free plan**. The Free plan has
**no automatic backups and no point-in-time recovery (PITR)**. This means
there is currently nothing to restore-test — a backup source has to exist
before this runbook can be executed for real.

**Recommendation:** add a scheduled `pg_dump` of the production database,
run at least daily, with the dump encrypted before it leaves the machine
that produced it (e.g. `gpg --symmetric --cipher-algo AES256`) and stored in
a bucket that is not the production Supabase project (e.g. a private,
server-side-encrypted object storage bucket). A Vercel Cron route or a
scheduled GitHub Actions workflow are both reasonable places to run it. This
is not implemented as part of this change — it needs its own decision about
where the dump is stored and who holds the encryption passphrase, which is
an infrastructure/secrets decision for a human, not a code change.

Until that exists, the "backup source" step below falls back to an ad-hoc
`pg_dump` taken manually right before the test. That satisfies "can we
restore the data" but does not satisfy "is a backup actually being taken
regularly" — the two are separate gaps.

## Backup source

One of:

- **A scheduled `pg_dump`** (once the recommendation above is implemented),
  taken from production and stored encrypted outside the production
  Supabase project.
- **A Supabase-managed backup**, if/when the project is upgraded to a plan
  that includes them (Pro and above). Check Project Settings → Database →
  Backups in the Supabase dashboard to confirm what the current plan
  actually provides before relying on it.

Either way, the restore test always restores *from the backup artifact*,
never by reading the production database directly during the test.

## Restore target

**Always a separate, disposable Supabase project. Never the production
project.** Use the same throwaway-project flow already documented in
`README.md` under "Environments" / "Setting up a dev/test environment":

1. Create a new Supabase project dedicated to this test (or reuse a
   standing dev project, as long as it is not production).
2. `supabase link --project-ref <throwaway-project-ref>`
3. Restore the backup artifact into it:
   - For a `pg_dump` taken with `--format=custom`: `pg_restore -d "$DATABASE_URL" backup.dump`
   - For a plain-SQL dump: `psql "$DATABASE_URL" -f backup.sql`
   - For a Supabase-managed backup: restore via the Supabase dashboard's
     backup-restore action, pointed at the throwaway project.
4. Do not run `supabase db push` or apply `supabase/seed.sql` as part of
   this process — the point is to verify the actual backup contents, not a
   freshly migrated schema.

## Frequency

At least once every 6 months (regulatory minimum). Given the Free-plan gap
above, run it quarterly until a real automated backup is in place, so the
first few tests also double as a check that the manual/ad-hoc `pg_dump`
process itself works.

## Procedure

1. Note the current time and the backup artifact being used (file name,
   dump timestamp).
2. Restore it into the throwaway Supabase project per "Restore target"
   above. Note how long the restore took.
3. Run `scripts/verify-restore.sql` against the **source** (production, via
   the SQL editor or `psql`, read-only query — no writes) and save the
   output.
4. Run the same script against the **restored target** and save that
   output.
5. Compare the two outputs by hand:
   - Row counts per table should match (or the target's counts should be
     explainable, e.g. if the dump was taken before the restore and
     production kept accepting writes in between).
   - The latest `leads` and `events` timestamp in the target should be at
     or before the dump timestamp, and should not be suspiciously older
     (which would indicate a stale or partial backup).
   - Every table should show RLS enabled with a nonzero policy count, and
     every critical function/trigger should show as present.
6. Record the result in the log table below, including anything that did
   not match and why.
7. Tear down the throwaway project/data if it was created solely for this
   test and is not otherwise in use as a standing dev environment.

## Test log

| Date | Performed by | Backup source | Restore time | Verification result | Deficiencies |
|---|---|---|---|---|---|
| | | | | | |
