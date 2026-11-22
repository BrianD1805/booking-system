# ZipBook / Booking System — Ver-0.061B Full Programme Release

**Base:** Ver-0.061A Full Programme. **Scope:** Correct the Practice Diary general 30-minute slot preview when the first/reference procedure is not assigned to a practitioner.

## Changes
- Practice Diary now uses procedure-independent active-clinician availability for its 30-minute preview. No hardcoded `checkup` or arbitrary procedure selection.
- The clinician dropdown filter, practice opening days, practitioner working hours, practice and practitioner lunch, leave/blocked times, overlapping bookings and date closures remain enforced.
- The separate Add booking flow is intentionally unchanged: a practitioner **must** be eligible for the actual selected procedure before a booking can be made.
- Open slot counts retain the existing all-practitioners versus individual practitioner behaviour.
- Added functional `test:diary-slots` regression tests covering no-checkup clinics, actual booking guards, individual practitioner filtering, working hours, lunch, leave, bookings and closures.
- Updated application and service worker version to Ver-0.061B. No database schema or client UI redesign.

## Commands (Windows CMD, project folder already open)

```cmd
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm audit --omit=dev && npm run typecheck && npm run build
```

```cmd
git status && git add -A && git commit -m "Booking System Ver-0.061B General Diary Slot Availability Fix" && git push origin main
```

No additional Supabase SQL required. Do not run Netlify Dev as part of the standard test command.

## Live acceptance
- In Demo Dental Admin choose Monday, 23 Nov 2026 with Dr Plonker active, working hours configured, and only Pull All Teeth assigned.
- The Slots view now shows a grid of 30-minute slots, rather than a single 08:30–17:00 block with "No practitioner can perform this procedure".
- `Open slots remaining` reflects available clinician slots, subject to working hours, leave, lunch, blocked times and bookings.
- Check an individual practitioner filter and a practice closure.
- Add booking still checks whether the chosen practitioner can perform the selected service.
- Public booking, staff iframe, branding and payment/onboarding gates remain unchanged.
