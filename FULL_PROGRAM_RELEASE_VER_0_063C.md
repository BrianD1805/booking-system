# ZipBook Ver-0.063C — Customer Account UX and Country Selector

Release metadata corrected on 23 November 2026. This corrected full-source release
replaces the earlier Ver-0.063C ZIP, which contained version labels from Ver-0.062
and Ver-0.063B. Do not deploy the earlier ZIP.

## Release corrections
- `package.json` version 0.0.63-c, matched in package-lock.json.
- The single visible version constant `APP_VERSION` is now exported by
  lib/domains.ts and re-exported by lib/mockData.ts for Admin/public UI.
- public/sw.js cache identifier is now zipbook-v0.063C.
- New `npm run test:version` checks the package, lockfile, UI, API and cache.
- Full source ZIP excludes node_modules and build artefacts; `npm ci` installs
  dependencies on the user's PC.

## UX scope carried over from original Ver-0.063C ZIP
- Client sign-up and country code selector refinements; business default
  country based on the tenant's already-existing Admin country setting.
- Password rule lowered to 8 characters and show/hide controls.
- Client code input compact styling, OTP practice branding changes, and
  booking confirmation hand-off improvements.

## Important verification limitations
- An earlier build reported some subset of test suites passed.
- The full production build, dependency audit, and live acceptance checks
  must still pass on the user's PC and published website.
- The phone country list in the original Ver-0.063C release was not exhaustive:
  not every country appears in search. A follow-up feature correction is required.
- HTML email cannot execute a functional copy-button script in common email
  clients: the verification code can be selected and copied; in-app test-mode
  codes have a copy button.

## Supabase SQL
No new migration required for the release-metadata correction.
