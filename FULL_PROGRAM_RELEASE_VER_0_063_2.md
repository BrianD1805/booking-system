# ZipBook Ver-0.063.2 — Customer Account Popup UX Patch

Release: 23 November 2026. Full programme update based on Ver-0.063.1.

## Changes

1. Country selector is centred on desktop as on mobile. Removed desktop anchor calculations that previously positioned it to the right.
2. Fixed the default customer phone country on public Login / Sign up: `lib/publicAvailability.mjs` now includes `clientPhoneCountryCode` in the explicit public bootstrap settings projection. This was absent in Ver-0.063.1 even though Admin saved the setting correctly.
3. On mobile only, Login / Sign up heading is hidden and the two-state header switch is centred, retaining the close icon on the right.
4. On the Login view only, phone country and phone input heights are 44px and grid rows align to content rather than stretching to the fixed modal height.
5. On desktop Login, password input occupies the left half and Forgot password sits to its right. Mobile retains the link underneath.
6. Login password eye has explicit 50% vertical positioning, without changing the correctly aligned Signup eye.
7. Updated package, lock, shared UI version, service worker and release documentation.

## SQL

No migration required. Keep the **Ver-0.063.1** migration already applied for the `practices.client_phone_country_code` column. This patch corrects the public API projection.

## Local testing (Windows CMD)

```cmd
npm ci && npm run test:version && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:country-ux && npm run test:account-ux-patch && npm audit --omit=dev && npm run typecheck && npm run build
```

Deploy only after all local steps pass:

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.2 Customer Account UX Fixes" && git push origin main
```
