# ZipBook Ver-0.063.6 — Real connected public demonstration

Released 24 November 2026 (Europe/London).

## What changed

- Replaced simulated `/demo` with a Turnstile-gated landing page connecting the actual `/book` customer application and the actual `/admin` Practice Diary at `admin.zipbook.app`.
- Both apps resolve the existing `zipbook.app` legacy tenant from the host and share the same Supabase booking tables; no fake in-memory diary. New demo visitors receive their own synthetic customer and 15-minute customer session.
- The real Admin diary accepts a signed, HttpOnly, cross-subdomain public demo cookie as a narrowly scoped **Demo / Reception** identity. No password or master key is exposed, and visitor sessions cannot access staff management, settings, integrations, audit, Platform Administration or protected business-owner routes.
- Real customer bookings are visible in the real diary; admin edits or cancellations are reflected in the customer account after Refresh. No replacement/mock booking APIs.
- Outbound customer confirmation email and push notices are suppressed when the original tenant is explicitly in real-demo mode. The demo account signup/login/OTP endpoints are disabled to avoid public email abuse; visitor accounts are automatically provisioned instead.
- 6 temporary demo starts/hour/IP, 20 booking mutations/15-minute visitor session, plus server-side Cloudflare Turnstile and host/origin/tenant checks.
- Default-off safety configuration requires a separate acknowledgement that the selected tenant contains **test data only**. Platform-owner demo reset from Ver-0.063.4 is retained.

## Critical pre-publication checklist

1. Back up Supabase, verify `practice_001` really resolves to `zipbook.app`, remove all non-demo customers and appointments using the Platform owner reset tool, and save the default reset profile.
2. Apply `supabase/zipbook_real_demo_ver_0_063_6.sql` in the Supabase SQL editor. This only prepares the demo attempts table.
3. Set Netlify environment variables (never paste private values into chat):

   - `ZIPBOOK_PUBLIC_DEMO_ENABLED=1`
   - `ZIPBOOK_DEMO_TURNSTILE_SITE_KEY=<Cloudflare public key>`
   - `ZIPBOOK_DEMO_TURNSTILE_SECRET_KEY=<Cloudflare secret>`
   - `ZIPBOOK_DEMO_SESSION_SECRET=<random secret at least 32 characters>`
   - `ZIPBOOK_DEMO_RESET_ALLOWED_IDS=practice_001`
   - `ZIPBOOK_REAL_DEMO_TENANT_ID=practice_001`
   - `ZIPBOOK_REAL_DEMO_DATA_CONFIRMED=YES_TEST_DATA_ONLY`
   - `ZIPBOOK_REAL_DEMO_ENABLED=1` (**set this last**)

4. Confirm DNS for both `zipbook.app` and `admin.zipbook.app` resolves to the *same* ZipBook deployment; cookies use `Domain=zipbook.app` only in production.
5. Run `npm ci`, `npm run test:real-demo`, all standard regression tests, `npm audit --omit=dev`, `npm run typecheck`, and `npm run build` **locally**, then deploy via GitHub/Netlify.
6. Test `/demo` on a private/incognito browser on both desktop and mobile: complete Turnstile, open both real apps, book in the customer app and check it appears in the Admin diary. Edit/cancel in the diary, then refresh the customer account. Verify protected `/admin/settings`, staff and Platform pages are unavailable to demo visitors.
7. Inspect the live database and Netlify logs, validate rate limits, outbound notification suppression, concurrent sessions, resets and expiry before promoting on ZippyWeb.

**Security boundary:** Visitors can change test bookings. They must never have access to real data. Do not enable the live demo while the tenant contains genuine clients, records, appointments or sensitive settings. Never share the master Admin/Platform keys.

## Known restrictions

- Demo visitors can use genuine booking/diary/reception features and search fictional clients. Owner settings, staff management, integrations and audit are intentionally not editable.
- Customer signup, real email and push notifications are disabled for the publicly exposed demo; the customer app instead uses an automatically created fictional identity.
- Temporary demo customer records and bookings persist until a Platform owner reset; sessions expire after 15 minutes.
- Production Netlify + Supabase live acceptance tests remain necessary and cannot be completed in this build environment.
