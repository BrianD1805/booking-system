# ZipBook Ver-0.066 — Public Landing Page Redesign

28 November 2026. Baseline: Ver-0.065.4.

- Redesigned only the public root marketing page with a responsive navigation, product-led hero, illustrative fictional diary preview, feature grid, onboarding steps, website integration section, demo CTA and footer.
- Inter via Google Fonts, with Arial/Helvetica fallback, scoped to the landing page CSS module. No bundled font files or new npm dependencies.
- Standard brand blue #336699 for primary actions, deep blue and light-blue accents. Existing customer-specific themes and app styles unaffected.
- Public demo uses /demo (existing protected entry). Existing /book, /admin and /widget routes remain available. Invitation-only onboarding retained; business enquiries link to ZippyWeb.
- No changes to database, environment variables, API, auth, iframe snippets, Practice Diary, Platform, or Customer Booking App.
- Release version and service-worker cache updated; current release note check now derives its filename from the version.

Test locally: `npm ci && npm run test:all && npm audit --omit=dev && npm run typecheck && npm run build`.
Deploy after successful checks: `git status && git add -A && git commit -m "ZipBook Ver-0.066 Public Landing Page Redesign" && git push origin main`.
