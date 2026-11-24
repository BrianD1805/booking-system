# ZipBook Ver-0.063.8 — Real Customer Signup, 30-Minute Demo, Verified Repeat Visits

Release: 24 November 2026 (UK).

## Scope

The full public demo now uses the actual customer signup and login routes, email OTP verification, real bookings and the same restricted real Practice Diary built in Ver-0.063.6. No automatic synthetic login is supplied. Customers may create and verify their own demo account and sign in later; no guest-booking history is claimed from a matching telephone number alone.

- First human-verified attempt from an IP: **30 minutes** of access to the actual booking and diary app.
- Every subsequent demo start from that hashed network address: **first name, surname, international telephone number, email address and an emailed six-digit verification code**, successfully verified, before another 30-minute session. Signed sessions cannot be renewed by simply refreshing.
- Emails: customer signup, password reset and repeat-demo verification are real provider-delivered emails; automatic appointment/notification emails and pushes stay suppressed for demo visitors.
- Anti-abuse: Netlify-supplied network address fingerprint (salted hash only), Turnstile, 6 start attempts/hour, 4 sessions per network/24h, 4 OTP emails/day, one-minute resend delay and 5 code guesses. On shared networks, one person's visit can cause another to require email verification.
- Contact information is collected only for verification; it must not be treated as marketing consent. The demo tenant uses test data and should be reset periodically.

## Required Supabase migration

Run **`supabase/zipbook_demo_repeat_ver_0_063_8.sql`** first. It creates the RLS-locked `public.zipbook_public_demo_visitors` database table storing pseudonymous network fingerprints, repeat-demo contact details and hashed OTP metadata. No existing business or booking rows are deleted.

## Existing Netlify settings to retain

`ZIPBOOK_PUBLIC_DEMO_ENABLED`, `ZIPBOOK_DEMO_TURNSTILE_SITE_KEY`, `ZIPBOOK_DEMO_TURNSTILE_SECRET_KEY`, `ZIPBOOK_DEMO_SESSION_SECRET`, `ZIPBOOK_REAL_DEMO_TENANT_ID`, `ZIPBOOK_REAL_DEMO_DATA_CONFIRMED`, `ZIPBOOK_REAL_DEMO_ENABLED`, `ZIPBOOK_DEMO_RESET_ALLOWED_IDS`. Existing `RESEND_API_KEY` and `ZIPBOOK_EMAIL_FROM` (or `RESEND_FROM_EMAIL`) must be functional.

No additional Netlify variable is required.

## Guardrails

The public demo should be enabled only after `practice_001` has been verified as a fictional-only demonstration tenant, backed up and reset. Demo visitors cannot access protected Platform, owner Settings, staff, integrations or master-key endpoints. The 30-minute cookie and backend route gates are authoritative, including for customer actions. The public landing page opens customer and diary applications in separate tabs.

## Verification

Run `npm run test:demo-repeat`, all existing regression suites, `npm audit --omit=dev`, `npm run typecheck` and `npm run build`. Test the live email provider, first attempt, second verified attempt, incorrect/expired codes, session expiry, shared-network behaviour, both subdomains, and tenant isolation before advertising publicly. No live Supabase/Netlify checks are performed by this source package.
