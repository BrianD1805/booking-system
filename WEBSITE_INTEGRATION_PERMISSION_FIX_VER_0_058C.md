# ZipBook Ver-0.058C — Website Integration Permission Fix

## Background
The live owner-only Add authorised website modal returned HTTP 403 `Request not permitted.` for a valid HTTPS origin. The original CSRF check compared the browser Origin with `request.nextUrl.origin`. When Netlify rewrites/handles the request internally, the latter can differ from the actual owner-facing business URL.

## Changes
- Validate the browser `Origin` against the same `Host` already checked/resolved by `withTenantRequest` (current tenant hostname).
- Retain owner sign-in, JSON-only POST, required `Origin` header, business-tenant isolation and row-level security; never trust unverified `X-Forwarded-Host` values.
- Require HTTPS and default port for production `*.zipbook.app`; local `.localhost` accepts port-matched development requests.
- Add positive and negative CSRF regression cases for Netlify aliases, unrelated subdomains, spoofed hosts, plain HTTP and invalid Origin values.
- Update display/version and service worker cache to Ver-0.058C.

## Installation
This is a SOURCE-ONLY OVERLAY on top of your *already-security-updated Ver-0.058B* programme directory. The ZIP **does not contain package.json or package-lock.json**. Keep the Next.js 16.4.6 package and audited lockfile you've already deployed. After extracting, run:

`npm version 0.0.58-c --no-git-tag-version`

Then tests, `npm audit --omit=dev`, typecheck and build before Git push. No database SQL or environment variable changes.

## Live verification
1. Visit https://demo-dental.zipbook.app/admin as owner.
2. Open Website integration -> Add website.
3. Register a legitimate HTTPS website under your control and enable *public booking iframe* (leave diary iframe disabled for the first test).
4. Verify the site appears under Authorised websites and its booking snippet becomes available.
5. Confirm an unrelated origin still fails the same-origin CSRF check and that owner-only API access is enforced.
6. Only after this passes, test authorised private diary embedding separately.
