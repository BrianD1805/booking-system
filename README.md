# ZipBook Ver-0.063.15 — Booking refinements

24 November 2026. White customer booking canvas, next available date, mobile logo +25px, data-only tenant reset and five-hour Platform session. No SQL or environment changes. Suspend the target tenant and back up before resetting customer data.

## Windows CMD tests

```cmd
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:version && npm run test:demo-reset && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm run test:demo-ux && npm run test:real-demo && npm run test:demo-time && npm run test:demo-repeat && npm run test:demo-isolation && npm run test:account-ux-patch10 && npm run test:practice-time && npm run test:demo-branding && npm run test:booking-popup-ux && npm run test:booking-refinements && npm run test:platform-session-reset && npm audit --omit=dev && npm run typecheck && npm run build
```

## Separate Git deployment

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.15 Booking Dates and Platform Controls" && git push origin main
```

Previous release: `FULL_PROGRAM_RELEASE_VER_0_063_14.md`.
