# ZipBook / Booking System — Ver-0.061C Full Programme Release

**Baseline:** Ver-0.061B Full Programme, 22 November 2026.

## Scope — Practice Diary uses the configured slot interval

- Fixed `lib/availability.ts` `getDiarySlotsForDate`: the **general staff diary** now builds each visual slot at the configured `practiceSettings.slotIntervalMinutes` interval and uses that same number of minutes for its preview duration. It is still independent of the chosen procedure; only booking creation remains procedure-specific.
- Updated the main Practice Diary copy in `app/admin/page.tsx` to show the currently configured interval, e.g., **Visual 15-minute diary preview for the selected date and practitioner filter.**
- Explicitly removed any inner maximum-height/scroll clipping from the **main diary Slots view**, so it grows to display all configured-interval slots within the ordinary page flow. The whole page may still scroll on smaller screens; existing popup-specific scroll/sticky-header behaviour remains unchanged.
- Added 4 regression tests: 15-minute slots and count, other intervals (20/60), bookings overlapping 15-minute previews, and dynamic text/full-height Slots view.
- Preserved all previous service worker, Next.js 16.4.6, tenant-isolation, branding, eager iframe, settings, and booking safeguards.
- Updated version references in package.json/package-lock.json, lib/domains.ts and public/sw.js.

## Test results

- All **80 Node automated regression tests passed** in this workspace, including `npm run test:diary-slots` (10 tests).
- Changed TypeScript/TSX files passed a syntax transpilation check.
- **Not verified here:** npm ci from the live npm registry, npm audit, full TypeScript dependency resolution, Next.js production build, Netlify publishing, or live Supabase data. Run the Windows CMD block and verify on the published site.

## Windows CMD — one local test command (no Netlify Dev)

```cmd
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm audit --omit=dev && npm run typecheck && npm run build
```

## Git deployment — separate command

```cmd
git status && git add -A && git commit -m "Booking System Ver-0.061C Configurable Diary Slot Interval" && git push origin main
```

**Supabase:** No additional SQL required.

## Live acceptance

1. Demo Dental Admin → Settings: confirm the diary slot interval is **15 minutes**; save it.
2. Return to the main Practice Diary, select a working day and observe slots such as 09:00–09:15, 09:15–09:30, 09:30–09:45.
3. Confirm the explanation reads **Visual 15-minute diary preview for the selected date and practitioner filter.**
4. Confirm every slot is visible in an expanding main-diary grid (not a nested scrolling panel). On narrow screens, scrolling the overall page is normal.
5. Temporarily select another supported interval (e.g., 30), save, refresh main diary and confirm interval and description update; restore 15 minutes.
6. Confirm the counter, existing booking overlaps, leave, lunch breaks, and practice hours are correctly respected. The separate Add booking workflow still enforces the chosen procedure's duration and practitioner eligibility.

Do not introduce independent billing for ZipBook. ZippyWeb is the central commercial and subscription platform. Public booking and customer login gates remain intentionally unchanged.
