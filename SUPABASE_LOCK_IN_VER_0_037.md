# ZipBook Ver-0.037 — Supabase Lock-In / Remove Netlify Database Fallback

## Purpose

This build makes Supabase the official ZipBook production database and removes the Netlify Database fallback from the application runtime.

## What changed

- Removed the `@netlify/database` dependency from `package.json` and `package-lock.json`.
- Removed the Netlify Database branch from `lib/dbProvider.ts`.
- `getZipBookDatabase()` now always uses Supabase/Postgres through the transaction pooler connection string.
- `/api/database-health` now reports Supabase lock-in status instead of a Netlify fallback/default provider.
- The health endpoint now makes clear that Netlify Database fallback has been removed.
- Kept the full smoke-test table checks on `/api/database-health?smoke=1`.
- Kept temporary OTP test mode support from Ver-0.036A.

## Required live environment variables

ZipBook now requires Supabase database access in Netlify:

- `SUPABASE_DB_POOLER_URL`
- `SUPABASE_DB_SSL=1`
- Optional: `SUPABASE_DB_POOL_MAX=3`
- Temporary during testing: `ZIPBOOK_OTP_TEST_MODE=true`

`DATABASE_PROVIDER=supabase` can remain in Netlify, but it is no longer required because the app is now locked to Supabase.

## Important

Do not remove Supabase environment variables. The app no longer has a Netlify Database fallback.

After this build has been deployed and tested, the old Netlify Database service can be removed from Netlify.

## Version alignment

- Visible app version: Ver-0.037
- Service worker cache: zipbook-v0.037
- Package version: 0.0.37
