# ZipBook Ver-0.063.1 — Client Account UX / Country Selector

Release date and time: 23 November 2026, 07:36 GMT
Baseline: corrected full Ver-0.063C project.

## Changes
- New independent phone-country default in Admin Settings. Migration required before deployment.
- Full ISO 3166-1 country/territory directory in the search, with E.164 dial codes; priority UK, South Africa, Kenya, Australia and New Zealand, followed by EU.
- Dedicated country dialog portal above all account popups, centred on mobile and to the right, higher on desktop.
- A ZippyWeb-style blue, white-knob Login/Sign up switch is moved into the customer-account header, directly beside Close.
- Fixed-height responsive account popup prevents jumping between Login and Sign up; content scrolls inside.
- Stable outline-eye icon and eye-off icon; no emoji or hover displacement.
- Removed explanatory header sentence.
- One shared APP_VERSION constant, full package and lock metadata alignment, service worker cache bump, and updated test:version.

## SQL
Run `supabase/zipbook_default_customer_phone_country_ver_0_063_1.sql` first.
This migration adds only `client_phone_country_code` on `practices`, safely initialised from each business's existing country. It also grants the tenant runtime role UPDATE on that new column only, matching Ver-0.056 column-level permissions. No customer or booking deletion.

## Verification
Run all npm tests, npm audit, typecheck, build on the developer's Windows system. Full production build and npm audit require node_modules/network access on the developer’s Windows machine; they were not verified in this sandbox.
