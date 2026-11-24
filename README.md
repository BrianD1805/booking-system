# ZipBook Ver-0.063.7 — Full Programme

Released 24 November 2026 (UK). The project is the real multi-tenant ZipBook appointment booking and Practice Diary platform, deployed with GitHub, Netlify and Supabase. ZippyWeb owns the separate commercial billing/payment integration.

## Ver-0.063.7 changes

- Globally removes WebKit's blue tap highlight from clickable elements, without removing keyboard focus feedback.
- The real `/demo` landing page opens **both** the Customer App and Practice Diary in new tabs (`noopener noreferrer`).
- For temporary, authorised **public demo sessions only**, appointment displays in Customer App, Practice Diary and reception use the visitor's browser timezone, including the date when it differs from the practice date.
- Booking API values, actual calendar/working days, availability checks and database values remain in the business's configured IANA timezone. Non-demo businesses use their own practice timezone. The demo currently uses the original `Africa/Nairobi` tenant timezone. The ordinary diary clock now matches the business timezone instead of mixing device and practice clocks.
- Customer booking history now determines past bookings using practice time, avoiding incorrect browser-local comparisons.

**Release details and acceptance checks:** `FULL_PROGRAM_RELEASE_VER_0_063_7.md`.

## Security and setup

The Ver-0.063.6 real connected public demo is disabled by default until the owner has verified test-only tenant data and configured its Turnstile/session environment variables. Its temporary, tenant-restricted visitor session uses the real `/book` and real Practice Diary and must never expose the Platform or Admin master keys.

See `FULL_PROGRAM_RELEASE_VER_0_063_6.md` and `supabase/zipbook_real_demo_ver_0_063_6.sql` for original demo setup, permissions and safety checks. **No new SQL migration or Netlify variable is needed for Ver-0.063.7.**

## Version and release policy

- `lib/domains.ts` provides the authoritative `APP_VERSION` displayed on public/Admin pages.
- Update `package.json`, root `package-lock.json`, `lib/domains.ts`, `public/sw.js`, README and the release note for **every** release.
- Use dot-number patch suffixes like `Ver-0.063.7` rather than letters; run `npm run test:version` on each release.
- Always issue a full programme ZIP; preserve approved client Home, Admin and popup layouts unless a requested change requires an adjustment.
- Never allow a public demo session to access real tenant customers, owner-only settings, other businesses or master keys.

## Standard local test (Windows CMD)

```cmd
npm ci && npm run test:version && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm run test:demo-reset && npm run test:demo-ux && npm run test:real-demo && npm run test:demo-time && npm audit --omit=dev && npm run typecheck && npm run build
```

Run GitHub push separately after all tests pass:

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.7 Global Tap UX and Local Demo Times" && git push origin main
```

The above local typecheck, audit and build are required before deployment; do not assume their success solely from the ZIP or in-environment source tests. Check the live `/api/tenant-context` version after Netlify publishes.

## Key public routes

- `https://zipbook.app/demo` — restricted real connected demo landing page
- `https://zipbook.app/book` — original customer booking application
- `https://admin.zipbook.app/admin` — genuine Practice Diary
- `https://demo-dental.zipbook.app/book` — separate demonstration tenant
