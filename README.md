# ZippyWeb Booking System — Ver-0.004

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.004 — Practitioner Selection and Conflict Protection**

This build keeps the two installable app areas from one domain:

- `/book` — client-facing booking app
- `/admin` — owner/admin app
- `/widget` — website iframe/embed starter

## Important booking rule

This is a live booking system, not an appointment request system.

- A client can create a confirmed booking directly.
- Dentist/admin/staff can create a confirmed booking directly.
- Both apps use Netlify Database through API routes.
- Client-created bookings and staff-created bookings sync between both apps.
- Request/approval wording should not be used unless a future practice setting enables it.

## What Ver-0.004 adds

- Client can choose **First available** or a specific dentist/practitioner.
- Availability now checks practitioner working hours and practitioner procedure capability.
- Staff/admin can create a booking for a selected practitioner.
- Admin diary now shows the practitioner assigned to each booking.
- Server-side conflict protection has been added before saving a booking.
- The API refuses a booking if:
  - the practitioner cannot perform the selected procedure,
  - the practitioner is not working at that time,
  - the practitioner already has an overlapping live booking,
  - the practice is blocked at that time,
  - the practitioner is specifically blocked at that time,
  - or the practice is closed on that date.
- App version updated to **Ver-0.004**.
- Service worker cache updated to `zippyweb-booking-system-v0.004`.

## Local Program Files workflow

Place/update files in your local Program Files folder, for example:

```text
C:\01 My Work 2026\Booking System\Booking System Program Files
```

Open the terminal directly from that folder.

## Install / update packages

Run after applying the ZIP:

```bash
npm install
```

## Local testing with Netlify Dev

Use Netlify Dev for this build because the app uses Netlify Database and API routes:

```bash
netlify dev
```

Open:

```text
http://localhost:8888/
http://localhost:8888/book
http://localhost:8888/admin
http://localhost:8888/widget
```

## Database migrations

Ver-0.004 does not add a new migration. It uses the existing Ver-0.003/0.003A database foundation:

```text
0001_booking_system_foundation.sql
0002_multi_practitioner_prep.sql
```

If your local database is already at pending migrations 0, no migration apply is needed for this build.

To check:

```bash
netlify database status
```

## Local test checklist

1. Open `/book`.
2. Choose a procedure.
3. Choose **First available**.
4. Pick a date and available time.
5. Confirm the booking.
6. Open `/admin`.
7. Confirm the booking appears with a practitioner attached.
8. In `/admin`, choose the same practitioner/procedure/date.
9. Confirm the already-booked time is unavailable.
10. Add a staff booking for another available slot.
11. Return to `/book` and confirm that slot is no longer available for that practitioner.

## Build checks

Stop Netlify Dev with `Ctrl + C`, then run:

```bash
npm run typecheck
npm run build
```

## Git deploy commands

After local testing and build pass:

```bash
git status
git add .
git commit -m "Booking System Ver-0.004 practitioner selection and conflict protection"
git push origin main
```

Netlify will automatically deploy from GitHub.

## Next recommended build

**Ver-0.005 — Admin Settings Foundation**

Suggested next scope:

- Edit procedures and durations from admin.
- Edit practitioner working hours.
- Assign procedures to practitioners.
- Block a practitioner’s time.
- Block the whole practice.
- Add a cleaner settings layout for practice customisation.
