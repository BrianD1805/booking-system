# ZipBook Ver-0.034 - Supabase Schema Setup Pack

This folder prepares the ZipBook database schema for a fresh Supabase project.

## Files

- `zipbook_supabase_schema_ver_0_034.sql`  
  Full Supabase/Postgres setup SQL generated from the current ZipBook Netlify Database migrations 0001 through 0013.

## What this build does

- Provides a clean Supabase schema setup pack.
- Keeps the app on Netlify Database by default.
- Does not cut the app over to Supabase yet.
- Does not require a new Netlify Database migration.

## How to run the SQL in Supabase

1. Open the Supabase project.
2. Go to **SQL Editor**.
3. Create a new query.
4. Paste the full contents of `zipbook_supabase_schema_ver_0_034.sql`.
5. Run it once.
6. Confirm the verification query at the bottom returns the core ZipBook tables and the default demo practice.

## Expected default practice

The setup keeps the existing demo tenant/practice:

- Practice ID: `practice_001`
- Tenant slug: `zippy-dental-demo`
- Client app: `/book`
- Admin app: `admin.zipbook.app`

## Environment variables for the later cutover

Do not switch production yet. When the next build enables Supabase connection mode, Netlify will need values like:

```text
DATABASE_PROVIDER=supabase
SUPABASE_DB_POOLER_URL=postgresql://postgres.ucwkwtfpqsxtzielruuy:YOURDATABASEPASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
SUPABASE_DB_POOL_MAX=3
SUPABASE_DB_IDLE_TIMEOUT_MS=10000
SUPABASE_DB_CONNECTION_TIMEOUT_MS=10000
SUPABASE_DB_SSL=1
```

## Notes

- The schema uses normal public Postgres tables.
- RLS is not enabled yet because ZipBook currently goes through server-side API routes.
- Supabase Auth is not used yet. ZipBook keeps its current client/staff auth foundation for now.
- Client-facing `/book` layout remains locked and unchanged.
