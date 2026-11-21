# ZipBook / Booking System — Ver-0.060A (FULL programme ZIP)

Baseline: complete Ver-0.060 source. This is a targeted public booking-logo loading correction.

Changes:
- Booking page now uses its existing tenant-aware `/api/branding/icon` image endpoint directly from initial HTML render for both the header (72px source) and central logo (192px source). No default ZipBook image is shown first and swapped after a client-side `/api/branding` fetch.
- The public logo endpoint now permits 72px images, preserving the original header-size fallback icon, as well as the existing 180/192/512px variants. The endpoint still uses the current tenant scope and returns the stored custom PNG or a ZipBook fallback on businesses without a logo.
- Removed the redundant client-side branding lookup from `/book` only. The manifest, staff diary, database and Admin upload/delete remain unchanged.
- Strengthened branding regression test to assert no client-side logo version swap.
- Updated visible version, package/lockfile, and service-worker cache version. No additional Supabase SQL required (Ver-0.060 migration still applies).

Verification: execute the supplied combined Windows local test command including `npm ci`, all regression tests, `npm audit --omit=dev`, typecheck, build and `netlify dev --no-open`. Publish with a separate Git command after local checks.
