# ZipBook Ver-0.033 - Supabase Database Provider Foundation

Purpose: prepare ZipBook for a controlled migration from Netlify Database to Supabase Postgres without forcing an immediate live cutover.

## What changed

- Added `lib/dbProvider.ts`.
- Netlify Database remains the default provider.
- Added optional Supabase provider mode using a pooled Postgres connection string.
- Existing app database calls still use the same internal `database.sql\`...\`` pattern.
- Added `pg` dependency for future Supabase/Postgres connection mode.
- No schema migration is included in this patch.
- No production cutover is performed by this patch.

## Environment variables for future Supabase mode

Keep the current live app on Netlify Database until the Supabase schema has been created and tested.

When ready to test Supabase mode, set:

```text
DATABASE_PROVIDER=supabase
SUPABASE_DB_POOLER_URL=postgresql://postgres.xxxxx:password@aws-xxx.pooler.supabase.com:6543/postgres
```

Optional tuning:

```text
SUPABASE_DB_POOL_MAX=3
SUPABASE_DB_IDLE_TIMEOUT_MS=10000
SUPABASE_DB_CONNECTION_TIMEOUT_MS=10000
SUPABASE_DB_SSL=1
```

To keep using Netlify Database, omit `DATABASE_PROVIDER` or set:

```text
DATABASE_PROVIDER=netlify
```

## Important

The Supabase database still needs a schema setup pack before switching live traffic to Supabase. This patch only adds the provider foundation.
