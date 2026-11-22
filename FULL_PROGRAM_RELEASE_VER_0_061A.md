# ZipBook / Booking System — Ver-0.061A Full Programme Release

**Base:** Ver-0.061 full programme ZIP. **Scope:** Practitioner procedure-selection clarity and more precise SaaS readiness feedback.

## Functional changes
- In Admin → Settings → Edit/Add practitioner, assigned procedure buttons show a blue background and an explicit tick; unassigned buttons display a `+` indicator and a pale background.
- Clear instructions state that selection is toggled and **Save practitioner** persists it.
- Live selected/active assignment counters and warning when no active procedure is assigned; inactive procedures are labelled.
- Buttons expose `aria-pressed` for keyboard/screen-reader accessibility. The existing form actions, popup geometry, sticky header/footer, scroll locking and colour system remain in place.
- Platform Administration readiness checks now report a *specific* missing requirement: no active practitioner, no active service, no working hours, no assigned active procedure, or hours/assignments configured on different practitioners. Counts are read-only, derived exclusively from each queried practice.
- Updated version metadata, package/lockfile versions, and service-worker cache identifier to Ver-0.061A. Updated the stale shared UI version value.

## Validation
- All 70 automated tests passed in the build sandbox, including seven new tests (four new procedure-UX tests and three new readiness-specific tests).
- Changed TS/TSX files passed TypeScript syntax transpilation; full dependency-aware `npm run typecheck` and `npm run build` must be run on the user's Windows PC.
- Offline `npm ci` could not complete because `xtend-4.0.2.tgz` is not in the container's npm cache. No production Netlify deployment or browser verification has been performed by this build environment.

## Database and operational impact
- **No Supabase SQL migration required.** The existing readiness data query has additional read-only counts, but there are no DDL or stored record changes.
- Public bookings remain deliberately gated and tenant isolation, staff authentication, CSP and branding remain unchanged.
- No Stripe/ZippyWeb billing code was introduced in this release.

## Next commercial architecture (not built here)
- ZipBook is a **ZippyWeb product**. ZippyWeb is the source of truth for billing, invoices, subscriptions, plan purchases and cancellation.
- ZippyWeb will provide an unlisted ZipBook product and plans page, central Stripe checkout and a secure link to ZipBook onboarding.
- After verified ZippyWeb checkout/webhook events, the apps should exchange server-signed, idempotent, time-limited onboarding/entitlement messages mapped to the correct business tenant. Do not trust a client-side payment confirmation, unauthenticated redirects or page obscurity.
- Subscription status changes (active, past-due, cancelled, grace period) must synchronise with ZipBook entitlements through secured back-end integration. Do not recreate separate card payment/billing in ZipBook.
- This plan requires coordinated ZippyWeb and ZipBook work, schema design, staging tests and explicit approval before production.

## Local command (Windows CMD from Program Files folder)

```cmd
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm audit --omit=dev && npm run typecheck && npm run build && netlify dev --no-open
```

## Publish (after successful local tests and stopping Netlify Dev)

```cmd
git status && git add -A && git commit -m "Booking System Ver-0.061A Procedure Selection UX" && git push origin main
```

## Acceptance checks
1. Sign in to the correct business subdomain; Admin → Settings → Edit practitioner.
2. Confirm an unselected procedure displays `+`, shows **0 procedures assigned**, and warns that an active assignment is required.
3. Select the procedure, confirm blue tick and live count. Save, reopen, and confirm it remains assigned.
4. Deselect and save; check Platform Readiness reports **missing assigned active procedure**, not a generic message, if working hours and active procedures otherwise exist.
5. Reassign and save; check readiness passes if all prerequisites are met. Check it identifies other blockers accurately.
6. Verify published public booking iframe, staff diary, business logos and tenant isolation unchanged.
