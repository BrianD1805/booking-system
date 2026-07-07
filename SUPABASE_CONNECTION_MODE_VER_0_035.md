# ZipBook Ver-0.035 — Supabase Connection Mode

## Purpose
Prepare ZipBook to run against Supabase Postgres through the Supabase Transaction Pooler while keeping Netlify Database as the safe default until cutover.

## What changed
- Added `/api/database-health` to verify the active database provider and basic schema availability.
- Confirmed the app can switch providers using `DATABASE_PROVIDER=supabase`.
- Replaced the remaining direct `@netlify/database` usage in the admin settings API with the shared provider layer.
- Kept Netlify Database as the default provider unless `DATABASE_PROVIDER=supabase` is explicitly set.
- No database migration required.

## Supabase environment variables for later cutover
```text
DATABASE_PROVIDER=supabase
SUPABASE_DB_POOLER_URL=postgresql://postgres.ucwkwtfpqsxtzielruuy:YOURDATABASEPASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
SUPABASE_DB_POOL_MAX=3
SUPABASE_DB_IDLE_TIMEOUT_MS=10000
SUPABASE_DB_CONNECTION_TIMEOUT_MS=10000
SUPABASE_DB_SSL=1
```

## Health check
Open:

```text
/api/database-health
```

Expected before cutover:

```text
provider: netlify
ok: true
```

Expected after enabling Supabase and running the Supabase schema:

```text
provider: supabase
ok: true
defaultPracticeFound: true
```

## Important
Do not remove Netlify Database until Supabase has been tested locally and live.
