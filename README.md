# ZipBook Ver-0.063.11 — Full Programme

Released 24 November 2026 (UK). Multi-tenant ZipBook Customer Booking App and Practice Diary on GitHub, Netlify and Supabase. ZippyWeb retains separate commercial billing.

## Ver-0.063.11 — Practice timezone consistency

- Searchable practice time zone selector next to Currency in Admin Settings.
- Platform Demo Reset Defaults now include the practice timezone and currency and restore both on reset; legacy saved defaults can be loaded and resaved.
- Real Practice Diary, Customer Booking App (guest and signed-in), and Reception show exactly the same practice-local appointment dates/times. Diary clock uses practice time.
- Removed timezone explanation text from diary, booking and reception. Existing appointment values are not modified. Changing a live practice timezone changes how its existing clock times are interpreted.

**Supabase:** No new SQL. Existing timezone, currency and demo reset JSONB columns are reused.

**Netlify:** No new variables.

### Windows CMD — complete testing

```cmd
npm ci && npm run test:version && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm run test:demo-reset && npm run test:demo-ux && npm run test:real-demo && npm run test:demo-time && npm run test:demo-repeat && npm run test:demo-isolation && npm run test:account-ux-patch10 && npm run test:practice-time && npm audit --omit=dev && npm run typecheck && npm run build
```

### Separate GitHub/Netlify push

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.11 Practice Timezone Consistency" && git push origin main
```

## Release conventions

Issue the **full programme source ZIP** with accurate dot-numbered versions in the package, lockfile, Admin/public shared version, service-worker cache, release documentation, and automated version test. No `cd` line. Keep local tests separate from deployment. Never claim production or live tests have passed before they have run.

Further notes: `FULL_PROGRAM_RELEASE_VER_0_063_10.md` and previous release documentation.
