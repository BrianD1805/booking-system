# ZipBook — Ver-0.063.3

A ZippyWeb product. Multi-tenant SaaS appointment scheduling, booking and client account system, deployed using GitHub, Netlify and Supabase. Commercial plans, payments and subscriptions will be managed by ZippyWeb, not duplicated in ZipBook.

## Latest full release

**Ver-0.063.3 — Client Account Mobile UX**, 23 November 2026.

- Mobile client account close icon is fixed top-right, with a separate centred Login/Sign up toggle.
- Mobile badge reads “Client Account - Login/Setup”; desktop header remains unchanged.
- Telephone forms request browser autofill suppression, and popup fields have extra right scrollbar clearance.

- Country popup is centred on both desktop and mobile, with searchable worldwide country/territory dialling codes.
- Common choices are presented first: United Kingdom, South Africa, Kenya, Australia, New Zealand, EU, and major world countries.
- Business Admin **Edit practice profile** has a separate **Default customer phone country** setting.
- Customer Login/Sign up uses a ZippyWeb-style toggle in the popup header and a stable-height layout.
- Password visibility uses fixed eye/eye-off icons.
- The customer signup popup no longer repeats explanatory header text.

See `FULL_PROGRAM_RELEASE_VER_0_063_3.md` for the latest patch and `supabase/zipbook_default_customer_phone_country_ver_0_063_1.sql` for the previously required migration. No new SQL migration is needed for Ver-0.063.3.

## Source and release policy

- `lib/domains.ts` defines **the authoritative APP_VERSION** displayed by public booking pages and the Admin interface.
- Keep `package.json`, root package-lock version metadata, `public/sw.js` cache key, README and release notes synchronised with each release.
- `npm run test:version` verifies the shared version and package consistency.
- For small patch builds, use dot-numbered patches such as Ver-0.063.1, Ver-0.063.2, Ver-0.063.3 (not A/B/C).
- Preserve the approved public booking page, Admin layout and modal styling except where changes are specifically requested.
- Never enable public bookings for every tenant automatically; retain platform approval and secure tenant isolation.

## Local test command (Windows CMD; no Netlify Dev)

```cmd
npm ci && npm run test:version && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm audit --omit=dev && npm run typecheck && npm run build
```

No new Supabase migration is needed for this patch. After tests and build pass:

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.3 Client Account Mobile UX" && git push origin main
```

## Customer-facing entry points

- `https://demo-dental.zipbook.app/book` — public demo tenant booking page.
- `https://demo-dental.zipbook.app/api/tenant-context` — check reported live version.

Do not infer the deployed release from a ZIP filename. Netlify must publish the updated commit and the live version endpoint must agree with the release.
