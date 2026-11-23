# ZipBook — Ver-0.063.5

**Working release: 23 November 2026.** Complete source ZIP built from Ver-0.063.4.

## Customer account and booking UX
- Country-code selector uses a centred portal dialog on desktop and mobile and does not automatically focus its search input. Browser keyboard appears only when search is deliberately activated.
- Remove scrollbar arrow buttons and retain spacing. Signup email and password controls have equal fixed heights.
- Remove step-4 `Notes for the practice` label while keeping optional notes.
- Client Account signed-in header now shows customer name, mobile number, Signed in status and Sign out; inline Appointments and Push notifications expandable sections replace the previous stacked panels.
- Editing an appointment now displays the same animated diary-checking status as a new booking. Successful edits use the existing confirmation screen, including Copy details. Edit-flow buttons suppress WebKit tap highlight.

## Public demo (deliberately isolated)
- `/demo` provides a 15-minute temporary, fictional-data diary playground where visitors add/edit/remove simulated bookings without access to real customer data, tenant diary records or master keys. This is *not* staff access to the original live tenant's practice diary.
- Server-side Cloudflare Turnstile (siteverify with action and exact hostname checking), transactional PostgreSQL rate limit of six demo-start attempts per IP per hour, HttpOnly SameSite cookie with HMAC-SHA256 signature, strict host and origin checks, no-store, noindex.
- **Fail closed:** demo page remains disabled unless Netlify has `ZIPBOOK_PUBLIC_DEMO_ENABLED=1`, `ZIPBOOK_DEMO_TURNSTILE_SITE_KEY`, `ZIPBOOK_DEMO_TURNSTILE_SECRET_KEY`, and an unpredictable `ZIPBOOK_DEMO_SESSION_SECRET` at least 32 characters.
- Required SQL: `supabase/zipbook_public_demo_ver_0_063_5.sql`.
- Original legacy `/book`, Platform reset and admin permissions stay unchanged. Public demo does not use any staff/master key, send emails, or write appointments.
- The ZippyWeb site is a different project; to promote this sandbox, add a CTA linking to `https://zipbook.app/demo` after verification. No automatic ZippyWeb source changes are included.

## Verification
`npm run test:version`, `npm run test:demo-ux` plus all existing regression tests.
Full `npm ci`, audit, typecheck and production build must pass on the user's PC before deployment.
