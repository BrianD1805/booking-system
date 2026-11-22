# Booking System / ZipBook — Ver-0.063 (Full Programme)

Release: 22 November 2026. Source baseline: Ver-0.062 full programme ZIP.

## SaaS customer accounts

- Restores the existing top-bar Login/My account control, sign-up popup, email verification, password login, password reset and customer booking management on independent business /book pages.
- Enables independent tenant-scoped `/api/client-login/` APIs except the old OTP-as-login endpoints `/request-code` and `/verify`, which are restricted to the legacy practice until they are rewritten safely.
- New SaaS sign-ups create an unlinked customer account. Prior guest bookings are **not** silently merged by matching phone/email, as this is unsafe without verified ownership. Appointments booked while signed in belong to the account and appear in My account. Guest bookings remain available in the relevant business diary.
- Account details are not overwritten when a signed-in customer enters different patient contact details for a new appointment.
- Adds server-side session revocation on sign out, strict bearer tokens for business account session lookup, one-use sign-up/reset codes, database-backed sign-up/login/reset throttling.
- New passwords use salted scrypt; legacy hashes continue to be accepted for existing accounts and are upgraded automatically on successful sign-in. New SaaS account passwords require at least ten characters.
- Production cannot expose OTP test codes, even if a stale test-mode environment flag is present.
- Keeps existing header, home, popup and Admin styling. No new billing implementation; ZippyWeb remains central billing platform. Public bookings remain controlled in Platform Administration.

## Required Supabase SQL

Run `supabase/zipbook_customer_accounts_ver_0_063.sql` in the existing Supabase project's SQL Editor **before deploying** Ver-0.063. Creates a tenant-RLS-protected, per-business customer authentication throttle table; no existing customer or booking data are changed. Apply only once, but migration is idempotent.

## Test status

93 / 93 Node automated tests passed in the build environment, including the new SaaS customer-account tests. Changed TypeScript/TSX files passed TypeScript transpilation syntax diagnostics. Full `npm ci`, `npm audit --omit=dev`, `npm run typecheck`, and `npm run build` must still pass on the user's Windows PC. No Netlify Dev command is part of standard testing.

## Controlled acceptance tests

1. Apply SQL and deploy after all local checks pass.
2. On `demo-dental.zipbook.app/book`, confirm the account icon appears with the original top-bar/popup style.
3. Register a new **test** customer with a valid email, verify its emailed code, then sign in again with the same business-specific mobile number and password.
4. Make a signed-in guest-service appointment for a future date; check My account booking list, email receipt, and Demo Dental diary.
5. Edit and delete the test booking; check diary updates. Separately confirm ordinary guest bookings remain possible.
6. Sign out and confirm protected bookings cannot be accessed using the revoked token.
7. Open James Plumbing: a Demo Dental token must not work there, and its appointment history must be separate. A customer may register independently using the same phone number there.
8. Test invalid password throttling and password reset, then verify the old password no longer signs in.
9. Confirm existing site iframe, business branding, diary and main public booking workflow still work.

## Notes / deferred

- Historical guest bookings are deliberately not imported into account history; future guest-claim workflows require independent verified identity and explicit consent.
- End-to-end account, email and Supabase RLS checks on real tenants are not yet verified by the build environment.
- Never commit local `.env` files, secrets or real client data to the full ZIP.
