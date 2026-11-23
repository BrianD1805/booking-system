# ZipBook Ver-0.063.3 — Client Account Mobile Header & Telephone Field UX

Release: 23 November 2026. Complete programme update based on Ver-0.063.2.

## Changes

1. The Login/Sign up header's close button is a direct child of the popup header, separate from the centred switch on narrow mobile screens. It stays top-right without overlapping the switch.
2. On mobile only, replace the small badge with “Client Account - Login/Setup”. Desktop text and layout stay as before.
3. Remove the WebKit tap-highlight flash on the Login/Sign up switch and adjacent labels, preserving keyboard focus outlines.
4. Set telephone input autofill to `off` and add conventional password-manager ignore hints for the customer account login/signup, password reset, and guest appointment forms. Browser extensions and browsers can override these preferences.
5. Add right padding inside the scrollable customer account fields so input borders do not touch the scrollbar.
6. Bump package.json, package-lock.json, shared APP_VERSION, public service-worker cache, and README. Add Ver-0.063.3 regression checks.

## Supabase

No SQL migration required. Keep existing Ver-0.063.1 practice default phone country migration.

## Windows local tests

```cmd
npm ci && npm run test:version && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm audit --omit=dev && npm run typecheck && npm run build
```

## Deployment (after tests)

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.3 Client Account Mobile UX" && git push origin main
```

Verify published version via `/api/tenant-context` on the chosen business subdomain.
