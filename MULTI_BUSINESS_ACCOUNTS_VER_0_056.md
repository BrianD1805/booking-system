# ZipBook Ver-0.056 — Multi-business accounts, controlled pilot foundation

Baseline: complete Ver-0.055. The existing default practice remains on its existing hosts and retains its existing master-key + staff sign-in. New business IDs are resolved from the hostname only. No tenant ID in an API body/query/header is trusted. All database-backed request handlers enter an asynchronous request scope. Every application SQL statement uses a transaction-local restricted role and practice identity; the narrow hostname resolver alone uses the existing connection account. No process-wide tenant cache remains.

## Safety / release gates

This is a candidate build, NOT a production SaaS launch. No real business (including SPBIO) was created, provisioned, activated or granted access. The new business runtime is opt-in (`ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS=1`) and each pilot row starts with `pilot_enabled=false`. Keep both off in production until staging checks pass. Use synthetic records only. Do not use a copy of real customer/patient data for testing. Run database backup/recovery checks and obtain an independent security review before processing real patient information. Tenant isolation is designed with PostgreSQL RLS, but must be proven on the actual deployed schema and actual pooler role.

### Staging database

1. Create a **separate** Supabase project/database, not the production database. Apply the existing full `supabase/zipbook_supabase_schema_ver_0_034.sql` schema, followed by the applicable additive 0.048, 0.050, 0.052 and 0.054 SQL files in order (inspect for any already-applied migration). The original schema includes synthetic demo records.
2. Run `supabase/zipbook_multi_business_ver_0_056.sql` as the database owner. This migration requires the existing connection role `postgres` (the normal Supabase transaction pooler user). If your runtime uses a different database role, stop and review its grant, never grant the restricted role to anon/authenticated. The migration changes table permissions/RLS, so staging is required before production. The heartbeat remains independent.
3. Run `supabase/zipbook_verify_tenant_isolation_ver_0_056.sql` in the staging database SQL editor. It creates temporary synthetic rows, switches to the runtime role, checks reads, writes, session isolation, foreign references, activation permission and missing-scope denial, then rolls back. Any failure blocks deployment. A source-level test is not evidence this SQL worked in Supabase.
4. Configure a separate local/staging Netlify environment to the staging database URL. Do not use production keys, production notifications, or a production-linked local Netlify session for synthetic bookings. Set `ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS=1` only in staging. Keep email/push disabled or use dedicated testing providers; do not send real customer notifications. Verify the effective database environment before making test bookings.

### Disposable pilot provisioning

Run `node scripts/prepare-business.mjs alpha-test "Test Alpha" "Alpha Owner" alpha@example.invalid Europe/London GBP GB` and separately `node scripts/prepare-business.mjs beta-test "Test Beta" "Beta Owner" beta@example.invalid Europe/London GBP GB`.
The tool creates a unique offline SQL file in your OS temporary directory, prints a randomly generated initial password to your terminal, and never connects to a database. Keep the password privately. Review and paste each generated SQL into the STAGING SQL editor. Do not commit either file or password. For this software test only, enable the two synthetic businesses within staging:

```sql
UPDATE public.practices SET pilot_enabled=true
WHERE plan_code='pilot' AND tenant_slug IN ('alpha-test','beta-test');
```

Attempt `http://alpha-test.localhost:8888/admin` and `http://beta-test.localhost:8888/admin` from local Netlify dev. Local subdomain host forwarding depends on local browser and Netlify Dev support; if not working, use individually configured staging hostnames with valid HTTPS and route them to the staging deployment. Don't weaken hostname checking or fall back to demo. Production pilot hostname convention would be `<slug>.zipbook.app`; configure DNS, Netlify domain assignment and HTTPS first. There is no automatic wildcard DNS or custom-domain verification in this release.

### Test matrix (synthetic only)

- Sign into Alpha and Beta independently; a wrong-business password/session must fail; same contact email may be used on both independent tenant accounts.
- Create Alpha-only and Beta-only services/practitioners and hours, then make a synthetic future booking for each. Check that other-business rows are not visible in diary, client search, settings, reports, audit, public availability, or push subscriptions.
- Replay an Alpha staff token on the Beta origin and attempt GET/PATCH/DELETE against an Alpha booking ID. All private operations must fail or return no row. Repeat in the opposite direction, with same browser and simultaneous requests. Inspect API responses, not merely screens.
- Check unknown, disabled and malformed hosts never resolve to a default tenant. Check the legacy practice still works: login, staff, settings, client booking and diary. No data migration or automatic deletion of existing rows.
- Owner can manage staff/settings; reception role cannot manage staff or save settings. Owner records cannot be created/edited/deleted via regular staff routes. Owner onboarding/password recovery and granular permissions remain future work.
- Test sign out, failed login throttling, PWA install IDs and service-worker updates, and the scoped database-health endpoint. Public health endpoint intentionally no longer exposes global database metadata/counts; `?smoke=1` needs staff login headers.
- In staging, switch off `pilot_enabled` and/or the environment flag and confirm access is denied.

## Deliberate limits

The pilot is not a public self-service signup system. New business staff use email/password without the global master key, strong randomly generated initial passwords, scrypt hashes and a per-account fixed-window staff login throttle. Existing practice password hashing is retained for rollback compatibility. Full owner invitations, verification, recovery, platform admin, subscription billing and custom domain management are not included. Business account creation is currently manual/operator-controlled. The new pilot public booking surface supports guest bookings only; legacy client signup/login/OTP code requires another security hardening pass, so client accounts and staff client password setup are blocked on pilot hosts. Pilot guest booking home has a business name and no active client login button; existing default /book layout is preserved. Demo bulk-past-bookings cleanup is blocked for pilots. Settings staff management is owner-only; broader role-based access remains pending. Admin iframe and public embedding remain disabled on pilot hosts until an approved-domain authentication strategy is implemented. Do not replace SPBIO's existing appointment system.

## Local validation

Run `npm ci`, `npm run test:heartbeat`, `npm run test:booking-time`, `npm run test:scheduling`, `npm run test:saas`, `npm run test:tenants`, `npm run typecheck`, `npm run build`, `netlify dev --no-open` in the staging-configured project. The delivered archive passed 32 Node tests and TypeScript syntax parsing, but dependency install was unavailable and no full typecheck, build, Netlify deployment or Supabase execution was verified here. Keep production on the prior working release until those gates pass.
