# ZipBook Ver-0.037A — Supabase Lock-In Build Fix

This is a same-build correction to Ver-0.037.

## Fix

- Added a retired/disabled replacement route for `app/api/admin/cleanup-brian-test-data/route.ts` so any stale local copy is overwritten during extraction.
- Removed the last stale `@netlify/database` import path that could remain in existing local working folders.
- Kept Supabase locked in as the only database runtime.

## Versioning

- Visible app version: Ver-0.037A
- Service worker cache: zipbook-v0.037a
- Package version: 0.0.37-a

## Notes

The retired cleanup endpoint now returns HTTP 410 and does not touch the database.
