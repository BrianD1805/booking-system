# ZipBook Ver-0.063.10 — Full Programme

Released 24 November 2026 (UK). Multi-tenant ZipBook Customer Booking App and Practice Diary on GitHub, Netlify and Supabase. ZippyWeb retains separate commercial billing.

## Ver-0.063.10 fixes

- Demo Customer App now opens `/book` at the regular Home screen. Visitors can book as a guest or open Login / Sign up themselves; the demo no longer automatically opens an account popup.
- Removed **End demo and open normal booking** from the Customer App. The full demo landing page retains its own End demo session control.
- All customer booking tenants now have a clear Create Account busy popup, descriptive field-validation errors and a prominent error popup for duplicate email/mobile accounts and failed requests. The request advances to email verification only if the OTP is deliverable.
- Retains the 30-minute verified demo, connected genuine Practice Diary, secured tenant-specific access, and all approved Home and Admin styling.

**Supabase:** No new SQL. Retain migrations through Ver-0.063.8.

**Netlify:** No new variables. Retain existing demo and Resend security settings.

### Windows CMD — complete testing

```cmd
npm ci && npm run test:version && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm run test:demo-reset && npm run test:demo-ux && npm run test:real-demo && npm run test:demo-time && npm run test:demo-repeat && npm run test:demo-isolation && npm run test:account-ux-patch10 && npm audit --omit=dev && npm run typecheck && npm run build
```

### Separate GitHub/Netlify push

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.10 Home First and Sign-up Feedback" && git push origin main
```

## Release conventions

Issue the **full programme source ZIP** with accurate dot-numbered versions in the package, lockfile, Admin/public shared version, service-worker cache, release documentation, and automated version test. No `cd` line. Keep local tests separate from deployment. Never claim production or live tests have passed before they have run.

Further notes: `FULL_PROGRAM_RELEASE_VER_0_063_10.md` and previous release documentation.
