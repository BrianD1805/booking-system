# ZipBook Ver-0.063.8 — Full Programme

Released 24 November 2026 (UK). The project is the real multi-tenant ZipBook appointment booking and Practice Diary platform, deployed with GitHub, Netlify and Supabase. ZippyWeb owns the separate commercial billing/payment integration.

## Ver-0.063.8 changes

- **Full real customer registration restored in the demo:** visitors can sign up, receive a real email verification code, log in with their password, and manage appointments in the live, demo-tenant booking database. No automatic fictional customer login.
- **30-minute secure demo sessions:** signed HttpOnly cookies work for `zipbook.app` and `admin.zipbook.app`; expiration is checked server-side.
- **Repeat demos:** a second start from the same IP requires first name, surname, international phone and email, and a six-digit email verification code before a new 30-minute session. Includes Turnstile, a 10-minute verification window, at most five code guesses, resend delays and daily rate limits.
- **IP fingerprinting:** the IP is hashed with the session secret and the hash is stored in the restricted Supabase demo visitors table. Shared networks may trigger repeat verification for other visitors; it is an anti-abuse signal, not unique identity.
- **Safety:** demo registration uses unlinked customer records rather than claiming prior guest bookings. Demo booking-confirmation emails and pushes stay disabled; only explicitly requested account-verification and repeat-demo access emails are sent. Existing Platform/Staff keys are never shared.
- **Mandatory SQL migration:** `supabase/zipbook_demo_repeat_ver_0_063_8.sql`. This release cannot launch repeat-demo access until the migration is applied. Normal business accounts are unaffected.
- **Resend email delivery is required** (`RESEND_API_KEY` and `ZIPBOOK_EMAIL_FROM` or `RESEND_FROM_EMAIL`). Failed delivery never grants a repeat session.
- **Release number:** metadata, UI displays, package lock, PWA service worker and release notes updated to Ver-0.063.8.

## Security and setup

The Ver-0.063.6 real connected public demo is disabled by default until the owner has verified test-only tenant data and configured its Turnstile/session environment variables. Its temporary, tenant-restricted visitor session uses the real `/book` and real Practice Diary and must never expose the Platform or Admin master keys.

See `FULL_PROGRAM_RELEASE_VER_0_063_6.md` and `supabase/zipbook_real_demo_ver_0_063_6.sql` for original demo setup, permissions and safety checks. **Ver-0.063.8 requires the new `supabase/zipbook_demo_repeat_ver_0_063_8.sql` migration before deploying.** No new Netlify variable is needed; the existing Resend email credentials must be configured.

## Version and release policy

- `lib/domains.ts` provides the authoritative `APP_VERSION` displayed on public/Admin pages.
- Update `package.json`, root `package-lock.json`, `lib/domains.ts`, `public/sw.js`, README and the release note for **every** release.
- Use dot-number patch suffixes like `Ver-0.063.8` rather than letters; run `npm run test:version` on each release.
- Always issue a full programme ZIP; preserve approved client Home, Admin and popup layouts unless a requested change requires an adjustment.
- Never allow a public demo session to access real tenant customers, owner-only settings, other businesses or master keys.

## Standard local test (Windows CMD)

```cmd
npm ci && npm run test:version && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm run test:demo-reset && npm run test:demo-ux && npm run test:real-demo && npm run test:demo-time && npm run test:demo-repeat && npm audit --omit=dev && npm run typecheck && npm run build
```

Run GitHub push separately after all tests pass:

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.8 Real Signup and Verified 30-Minute Demo" && git push origin main
```

The above local typecheck, audit and build are required before deployment; do not assume their success solely from the ZIP or in-environment source tests. Check the live `/api/tenant-context` version after Netlify publishes.

## Key public routes

- `https://zipbook.app/demo` — restricted real connected demo landing page
- `https://zipbook.app/book` — original customer booking application
- `https://admin.zipbook.app/admin` — genuine Practice Diary
- `https://demo-dental.zipbook.app/book` — separate demonstration tenant
