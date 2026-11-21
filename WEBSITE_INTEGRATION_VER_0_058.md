# ZipBook Ver-0.058 — Website integration

**Release**: Ver-0.058. Full replacement project built from Ver-0.057.

## Overview

- Public `/widget` landing page explains booking links, HTML blocks and developer integration.
- Business owners have **Admin menu → Website integration** or **Settings → Website integration**.
- Owners may register up to 10 exact HTTPS web origins. Public and staff-diary iframe permissions are independent.
- Business-specific `/book` and `/admin` URLs and HTML/React snippets are generated from the server-resolved tenant slug, not user-entered practice IDs.
- Staff authentication and tenant RLS are unchanged. HTML snippets contain no access tokens, passwords or secrets.
- The live application sets `Content-Security-Policy: frame-ancestors ...` only for approved origins. A missing allowlist, missing SQL migration, suspended business or database failure causes `frame-ancestors 'none'`.
- The staff snippet includes a separate full-page sign-in link for browsers that block third-party storage.

## Required Supabase migration

Run `supabase/zipbook_website_integration_ver_0_058.sql` in the existing Supabase SQL Editor **before** deploying. The migration creates one tenant-scoped table, `zipbook_embed_domains`, with restrictive row-level-security policy. No existing data is replaced or deleted.

No new Netlify environment variables. Keep `ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS=1` and existing Supabase/Resend variables.

## Deployment

Extract the complete Ver-0.058 ZIP over the existing program folder. In Windows Command Prompt, run one command per line:

```bat
npm ci
if exist .next rmdir /s /q .next
npm run test:heartbeat
npm run test:booking-time
npm run test:scheduling
npm run test:saas
npm run test:tenants
npm run test:onboarding
npm run test:integration
npm run typecheck
npm run build
netlify dev --no-open
```

When those checks pass, push separately:

```bat
git status && git add -A && git commit -m "Booking System Ver-0.058 Website Integration and HTML Snippets" && git push origin main
```

## Manual acceptance checks

1. In the demonstration business, sign in as **Owner** and open Admin → Website integration.
2. Copy the booking link. Verify it resolves to this business, not the original practice.
3. Enter an **HTTPS domain you own/control** and enable *public bookings*. Save. Confirm the generated booking iframe can load from that exact domain.
4. Check the same iframe is blocked from an unapproved website origin (the browser console should report the `frame-ancestors` restriction).
5. Keep diary permission OFF; confirm the staff diary is blocked in a third-party iframe.
6. Edit the website and switch diary permission ON. Confirm staff sign-in is still required and the diary contains only this business's records.
7. Test staff diary fallback *Open in new tab* in a browser that blocks iframe storage.
8. Remove the website and verify that newly loaded iframes are blocked again.
9. Check the original practice's private admin key and diary remain unchanged; no integration controls exposed to unrelated staff.
10. Check the public home page and client `/book` layout remain unchanged; verify no API or admin pages are stored by the PWA.

**Limitations:** Not all website builders allow custom HTML/iframes. Use a simple booking link where embedding is blocked. Iframe heights are manual. No cross-origin automatic resizing or third-party cookie bypass is attempted. Embedded staff login support depends on browser storage policy; the full-page fallback is intentional.

**Validation:** All Node automated tests pass and TypeScript files parse. The full Next.js dependency-based typecheck and build must be run locally: this packaging environment's npm cache cannot install the complete dependency set.
