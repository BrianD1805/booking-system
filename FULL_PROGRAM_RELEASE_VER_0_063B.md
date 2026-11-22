# Booking System Ver-0.063B — Customer Account TypeScript Build Fix

Prepared 22 November 2026. Complete-source maintenance release based on Ver-0.063A.

## Correction

- Fixed the `TS2345` type error in `lib/db.ts` at the legacy `requestClientLoginOtp()` call. The `ensureClientLoginCustomer()` helper now receives the required `fullName` argument on that older path.
- The legacy OTP endpoint is explicitly blocked for business tenants by `withTenantRequest()`, so this compatibility fallback does not weaken the required first-name/surname signup validation for SaaS customers.
- The business signup route still validates and stores the customer's real full name; it cannot automatically claim older guest booking history.
- Added `tests/client-login-legacy-typecheck.test.mjs` to catch regression in the legacy helper call and its tenant restriction.
- Bumped package, lockfile, displayed version and service-worker cache to Ver-0.063B. No new SQL.

## Windows test command (no Netlify Dev)

```
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm audit --omit=dev && npm run typecheck && npm run build
```
