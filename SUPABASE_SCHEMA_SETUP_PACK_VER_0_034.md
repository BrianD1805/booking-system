# ZipBook Ver-0.034 - Supabase Schema Setup Pack

Prepared a clean Supabase SQL setup pack from the current Netlify Database migrations.

## Added

- `supabase/zipbook_supabase_schema_ver_0_034.sql`
- `supabase/README_SUPABASE_SETUP_VER_0_034.md`

## Scope

This build does not switch the app to Supabase. Netlify Database remains the default until the Supabase schema is created and the next connection/cutover build is tested.

## Included schema areas

- practices / tenant foundation
- tenant domains
- booking tables
- procedures
- practitioners
- practitioner working hours and procedure capability links
- clients / customer records
- family members
- client documents
- client accounts, sessions and OTP codes
- admin staff members and sessions
- audit logs
- practice settings foundation

## Default demo tenant

- `practice_001`
- `zippy-dental-demo`

## Database migrations

No new Netlify Database migration is required for this build.
