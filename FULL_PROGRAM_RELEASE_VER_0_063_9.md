# ZipBook Ver-0.063.9 — Ordinary Booking and Verified Demo Separation

Release date: 24 November 2026 (UK).

## Why this patch is necessary

The previous implementation used `isRealDemoTenant()` (meaning **the demo feature is enabled for `practice_001`**) in the ordinary customer API guard and database side-effects. Consequently a normal visit to `https://zipbook.app/book` could be treated as a demo even when the visitor had not started a signed demo, including blocking customer sign-ups and suppressing booking emails and push notifications.

## Corrected behaviour

- `practice_001` remains both the default original business and the practice whose actual booking/diary database is used for a connected demonstration. The database and tenant identity are **not** duplicated or redirected.
- Every API request is evaluated independently: only an **unexpired, cryptographically verified demo session cookie** on the allowed legacy host receives the scoped `demoVisitor` flag. An ordinary request has `demoVisitor=false`.
- Demo-only customer API restrictions, CSRF checks, write limits, unlinked account registration, and notification/email suppression now run only for verified demo requests.
- Ordinary `/book` customers retain their regular booking and login behaviour and their configured booking notifications.
- **Demo-created client login sessions** are limited to the signed demo expiry, rather than the normal 30-day customer login expiry. Normal customer logins still receive 30 days.
- Restricted Practice Diary permissions still require a valid signed demo token and an explicit allowlisted API route; Platform settings, owner keys and staff management remain protected.
- The Customer App banner now has an **End demo and open normal booking** action. It revokes the shared demo cookie, clears the browser's demo customer token, and reloads `/book` as an ordinary visit.

## Important shared-tenant limitation

Because both modes deliberately use the **same tenant (`practice_001`) and the same customer/booking database**, they cannot be treated as independent data stores. A signed and active demo cookie affects the visitor across `zipbook.app` and `admin.zipbook.app` until the visitor ends that demo or it expires. Use the new exit action (or `/demo` → End demo) to return to ordinary mode. Demo accounts are real tenant accounts and their credentials can be used on the ordinary login route; this patch does **not** provide fully independent demo-only customer identity or segregated datasets. Such separation requires a separate demo tenant or a dedicated demo-account and session schema/permission layer. Confirm **test data only** before enabling public demos.

## Deploy checklist

- No Supabase schema changes or new Netlify environment variables in this patch. Retain all existing Ver-0.063.8 demo security settings.
- Test `/book` in a clean browser without a demo cookie: normal signup/login, bookings, notification delivery and original `practice_001` context.
- Start `/demo` and verify temporary access to `/book` and the real diary, booking synchronisation, demo-only rate limits, disabled booking notifications, and 30-minute expiry.
- End the demo and confirm `/book` returns to ordinary mode with no demo banner or copied demo login token.
- Confirm the separate business tenant hostnames still work and no Platform/master-key privileges are granted.
- Run `npm run test:demo-isolation`, all other automated suites, `npm audit --omit=dev`, `npm run typecheck`, and `npm run build`. Deployment remains subject to live Netlify/Supabase verification.
