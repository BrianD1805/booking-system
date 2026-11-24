# ZipBook Ver-0.063.9 — Full Programme

Released 24 November 2026 (UK). Multi-tenant ZipBook Customer Booking App and Practice Diary on GitHub, Netlify and Supabase. ZippyWeb retains separate commercial billing.

## Ver-0.063.9 fix — ordinary booking versus active demo

- `/book` continues to serve the **original `practice_001`**; no change to default tenant routing.
- The demo remains at `/demo`, uses **the same `practice_001` booking data and real Practice Diary**, and is still limited to 30 minutes with Turnstile and verified repeat-demo access.
- **Only an unexpired, signed demo session for the current request** activates demo-only customer API controls, rate limits, unlinked demo signup and booking email/push suppression. Enabling the demo in Netlify by itself no longer changes regular customer behaviour at `/book`.
- New **End demo and open normal booking** button on the Customer App, removing the demo cookie and temporary client login token.
- Client login sessions issued during a verified demo now expire alongside the 30-minute demo. Ordinary client sessions retain their previous 30-day expiry.
- Owner/master-key security, tenant isolation and approved public, Admin and popup designs are retained.

**Important:** Because you chose the **same real tenant for the demo and normal `/book`**, both modes share customer accounts, appointments and practice settings. An active signed demo cookie switches that browser into demo mode until logout or expiry. Existing demo-created login credentials are not separately marked; using them from a fresh ordinary browser is still possible. Only use fictional/test data in `practice_001` when promoting the public demo. For independent data and accounts, a separate tenant or dedicated demo-account schema is necessary.

## Deployment

**Supabase:** No new SQL. Retain migrations through Ver-0.063.8.

**Netlify:** No new variables. Preserve `ZIPBOOK_PUBLIC_DEMO_ENABLED`, Turnstile keys, demo session secret, `ZIPBOOK_REAL_DEMO_TENANT_ID=practice_001`, data confirmation, reset allowlist, and existing Resend configuration.

### Windows CMD — automated tests, security audit, typecheck and production build

```cmd
npm ci && npm run test:version && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm run test:demo-reset && npm run test:demo-ux && npm run test:real-demo && npm run test:demo-time && npm run test:demo-repeat && npm run test:demo-isolation && npm audit --omit=dev && npm run typecheck && npm run build
```

### Separate GitHub/Netlify push after passing tests

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.9 Separate Normal Booking and Demo Sessions" && git push origin main
```

## Release conventions

- Update `package.json`, `package-lock.json`, `lib/domains.ts`, `public/sw.js`, README and the current release note every time. Use dot-number patch versions, e.g. Ver-0.063.9.
- Always issue the **full source ZIP**, not a patch. Avoid changes to approved Home-page, Admin and popup styles unless specifically requested.
- Confirm live tenant/API version and normal/demo modes after Netlify publishes. Run live database security tests on fictional test records only.

Further notes: `FULL_PROGRAM_RELEASE_VER_0_063_9.md` and historical release documents. ZipBook database is not reset by deploying this source.
