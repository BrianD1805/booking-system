# ZipBook Ver-0.063.7 — Global Tap UX and Demo Local Times

Released 24 November 2026 (Europe/London).

## Changes

1. Suppress WebKit blue tap-highlight flash globally, including all buttons, text links, icons and clickable elements on landing, booking, customer account, reception, Practice Diary and demo pages. Keyboard focus-visible outlines remain accessible.
2. On `https://zipbook.app/demo`, both **Open Customer App** and **Open Practice Diary** open in their own new browser tabs. The `rel="noopener noreferrer"` protection is retained.
3. Fix the mixed-clock problem in the real demo. The original practice is configured as `Africa/Nairobi`, while the diary clock had been formatted in the visitor's browser timezone. In a demo session, customer and diary slot displays now use the **visitor's local timezone**. UK winter example: 11:00 in Nairobi = 08:00 in London. A different local date is explicitly labelled to avoid mistakes. The demo header explains the practice timezone and the viewer timezone; regular businesses show their own practice clock.
4. **Security/integrity:** API booking `date` and `time`, practice calendar selection, all `bookingStartIsPast` checks, booking availability and Supabase database times still use the configured IANA **practice timezone**, never the visitor’s displayed timezone. Do not persist locally converted display values. This maintains a single consistent connected booking database for visitors in different countries.
5. Fix the existing customer appointment-list past-booking check so it compares in the practice timezone rather than parsing a practice wall-clock time as the browser's local time.

## No Supabase migration or environment-variable change

Uses existing Ver-0.063.6 Turnstile, public-demo security and tenant configuration. Only change visual presentation and demo links; do not remove the demo's 15-minute session, master-key boundaries or tenant isolation.

## Acceptance

- Verify the blue tap flash disappears sitewide on Android/iOS; check keyboard Tab still displays a focus outline.
- After starting a real demo, both launch buttons open separate tabs.
- Open `/admin` and `/book` during the same real demo: appointment slots for the same practice date show identical local wall-clock times; bookings made in one appear in the other and can be edited and cancelled.
- Simulate UK winter, UK summer and another timezone. Check a Nairobi 11:00 slot displays as UK 08:00 in November and UK 09:00 in July. Midnight-crossing slots include their correct local date.
- Check regular tenant booking and practice diary continue using each tenant's own timezone; other businesses are unaffected.
- Confirm practice diary selections use the practice calendar date. The display shows the local day explicitly when it differs. The underlying practice date must not change.

## Commands

Run all existing `test:*` scripts, including the new `npm run test:demo-time`, then `npm audit --omit=dev`, `npm run typecheck`, and `npm run build` on Windows before deployment.
