# ZipBook — Ver-0.059 (Full Programme: Eager Public Booking Embed)

Based directly on the uploaded **Ver-0.058D full programme baseline**. Complete source ZIP; no partial patch.

## Change
- Generated **HTML booking iframe** uses `loading="eager"` instead of `loading="lazy"` (verified as a successful workaround on the external mobile test page).
- Generated **React/Next.js public booking iframe** also uses `loading="eager"` for consistent behaviour.
- Secure staff diary iframe and secure sign-in remain unchanged.
- Added an automated regression test asserting public embeds are eager and staff snippets unchanged.
- Version synced across package.json, package-lock.json, lib/domains.ts, lib/mockData.ts, public/sw.js and API metadata.
- Previous Next.js 16.4.6 security patch, request-origin checks, fail-closed embedding policy and tenant isolation preserved.

## Not included
- Per-business client logo on public booking page or installed PWA: remains a planned, separate feature.
- No change to public booking enablement; end-to-end customer booking submission remains deferred until deliberately enabled.
- No Supabase schema change and **no additional Supabase SQL required**.
- No new Netlify environment variables.

## Install and local test (Windows Command Prompt, in existing project folder)
Extract all files from this full ZIP directly into the existing Program Files folder, replacing project files but keeping any local `.env` secrets.

```cmd
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm audit --omit=dev && npm run typecheck && npm run build && netlify dev --no-open
```

## Deploy (after stopping Netlify Dev with Ctrl+C)

```cmd
git status && git add -A && git commit -m "Booking System Ver-0.059 Public Booking Eager Loading" && git push origin main
```

## Smoke test
- Demo Dental Owner -> Website integration -> Copy HTML booking iframe: inspect `loading="eager"`.
- Verify generated public React code also contains `loading="eager"`.
- Publish/refresh an actual external booking test page using the newly copied snippet; confirm first-load mobile success without refreshing.
- Verify embedded staff diary still requires sign-in and opens normally.
- Existing approved `/book` home and popup styling are unchanged.

Running the automated tests locally is not proof of successful Netlify publication or real-browser operation; verify after deployment.
