# ZipBook Ver-0.063.4 — Platform Demo Reset / PWA icon

Release: 23 November 2026, 15:52 UTC. Complete project source ZIP.

## Included
- Public PWA dynamic manifest now advertises existing full-bleed maskable icons, avoiding Android's white surround for the original legacy ZipBook icon. Android may require uninstalling/reinstalling a previously cached PWA icon.
- Owner Platform Administration has a separate **Demo reset defaults** workspace. It lists only tenants explicitly opted in by `ZIPBOOK_DEMO_RESET_ALLOWED_IDS` in Netlify, including `practice_001` for the original ZipBook tenant.
- Save editable default booking settings. Reset requires acknowledgement and typing `DELETE`, validates again on the server, and runs all tenant-scoped deletions and settings restoration in one transaction. Owner accounts, staff passwords, master key, service/practitioner configuration and unrelated tenants are retained.
- Added `npm run test:demo-reset` and bumped version across package, lockfile, service-worker cache, Admin and public UI.

## Setup (required)
1. Run `supabase/zipbook_demo_reset_ver_0_063_4.sql` once in Supabase SQL Editor. Does not delete any data.
2. In Netlify's environment variables, set `ZIPBOOK_DEMO_RESET_ALLOWED_IDS=practice_001` (or comma-separated explicit approved demo IDs). Do not include real customer tenants. Redeploy after updating environment variables.
3. Open `https://zipbook.app/platform`, sign in using your private platform access key, choose **Demo reset defaults**. Select the original `practice_001`, edit/save defaults, and only then choose reset. No public visitor has reset access.

## Public demo access (not yet enabled)
No shared staff/owner credential, public master key or unprotected demo diary has been added in this release. The existing `/book` page can be linked for controlled guest-booking tests, but **do not publish it for unrestricted use until demo CAPTCHA/rate limits and email-abuse protection are implemented**.
Recommended next phase: dedicated demo staff login with tightly limited capabilities and short sessions, Turnstile on guest booking/account endpoints with server-side validation, per-IP/per-tenant limits, optional auto-reset, and demo email sandboxing. Never share `ZIPBOOK_PLATFORM_ADMIN_KEY` or the legacy Admin master key with visitors.

## ZippyWeb
ZipBook remains a separate GitHub/Netlify project. ZippyWeb can link to `https://zipbook.app/book` from a hidden/unlisted page once public demo safeguards are ready. For a built-in iframe, use the authorised public booking snippet and confirm domain permissions/CSP first. Updating the live ZippyWeb project itself requires its latest full project files; none were changed in this ZIP.

## Checks
Run `npm ci`, all project regression tests including `npm run test:demo-reset`, then `npm audit --omit=dev`, `npm run typecheck`, `npm run build`. No new recurring tasks, no auto deletion, no data migrations beyond saved-demo-profile table.
