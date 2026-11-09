# ZipBook Ver-0.052 — Supabase Heartbeat (Keepalive)

## What this adds

A lightweight Netlify Scheduled Function, `supabase-keepalive`, updates the **same row** in `public.zipbook_system_heartbeat` twice daily, at **03:15 and 15:15 UTC**. It does not create an accumulating history table, alter bookings, or send email.

The function uses ZipBook's existing PostgreSQL transaction pooler and the existing Netlify environment variables (`SUPABASE_DB_POOLER_URL` and `SUPABASE_DB_SSL=1`). No new keys, packages or Netlify environment variables are required.

## Setup (required before running the function)

1. In **Supabase > SQL Editor**, execute the entire file `supabase/zipbook_system_heartbeat_ver_0_052.sql` **once**. You can safely rerun the `CREATE TABLE IF NOT EXISTS` statement.
2. Deploy the full Ver-0.052 project to Netlify. Netlify detects the scheduled function from `netlify/functions/supabase-keepalive.mjs` and its cron configuration in `netlify.toml`.
3. In **Netlify > ZipBook site > Logs / Functions**, locate `supabase-keepalive`, confirm that it is marked **Scheduled**, and use **Run now** for an immediate production test (or wait for the next schedule).
4. In **Supabase > SQL Editor**, check the heartbeat row:

```sql
SELECT id, last_ping_at, run_count, created_at
FROM public.zipbook_system_heartbeat;
```

Expected: a single `zipbook-primary` row with the last successful time and `run_count` incrementing after each successful run.

## Timing and testing

- Netlify cron: `15 3,15 * * *` (**UTC**). During British Summer Time, these run at 04:15 and 16:15 UK local time.
- Local `netlify dev --no-open` does **not** run scheduled functions automatically. With Netlify Dev running, invoke a test using `netlify functions:invoke supabase-keepalive` from a **second terminal** with access to the same Supabase connection variables; do not treat absence of local automatic invocation as an error.
- `npm run test:heartbeat` tests the single-row UPSERT and error handling without needing a live Supabase database.
- Failures are logged by Netlify as a failed invocation; booking and admin flows are not dependent on the heartbeat.
- Netlify applies its default scheduled-function invocation limits. Secrets remain in the existing server-side environment.

## Why it matters

Supabase Free projects can pause after sustained low database activity. This provides regular database queries to reduce the risk of pausing, but **does not guarantee** that Supabase will never pause a Free project. For a production system with real clients, a paid Supabase plan remains the supported way to prevent inactivity pausing.

## Files touched

- `netlify/functions/supabase-keepalive.mjs` — scheduled database update
- `lib/supabaseHeartbeat.mjs` — testable UPSERT logic
- `netlify.toml` — twice-daily UTC schedule
- `supabase/zipbook_system_heartbeat_ver_0_052.sql` — single-row table
- `tests/supabase-keepalive.test.mjs` — tests
- Versions in `package.json`, `package-lock.json`, `lib/domains.ts`, `lib/mockData.ts`, `public/sw.js`, and retired cleanup route
