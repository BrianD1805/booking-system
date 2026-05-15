# ZippyWeb Booking System — Ver-0.002

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.002 — Live Diary Availability Foundation**

This build keeps the project as two installable app areas from one domain:

- `/book` — client-facing booking app
- `/admin` — owner/admin app
- `/widget` — website iframe/embed starter

## Important booking rule

This is a live booking system, not an appointment request system.

- A client can create a confirmed booking directly.
- Dentist/admin/staff can create a confirmed booking directly.
- Both apps use the same shared diary source.
- Client-created bookings and staff-created bookings must sync between both apps.
- Request/approval wording should not be used unless a future practice setting enables it.

In Ver-0.002, the shared source is browser localStorage so we can shape and test the journey before connecting Netlify Database.

## What Ver-0.002 adds

- Client date browser.
- Procedure selection with allocated duration.
- Available time-slot calculation.
- Existing bookings block unavailable slots.
- Blocked dates and blocked times block unavailable slots.
- Client booking creates a confirmed diary booking.
- Admin/staff booking creates a confirmed diary booking.
- Admin can cancel, complete, confirm or delete bookings.
- Running-late message placeholder.
- Version updated to Ver-0.002.
- Service worker cache updated to `zippyweb-booking-system-v0.002`.

## Local Program Files workflow

Unzip this ZIP and copy/replace the contents into your existing local **Booking System Program Files** folder.

Open the terminal directly from the Program Files folder.

Install dependencies only if needed:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/
http://localhost:3000/book
http://localhost:3000/admin
http://localhost:3000/widget
```

TypeScript check:

```bash
npm run typecheck
```

Production build check:

```bash
npm run build
```

## Local test checklist

1. Open `/book`.
2. Choose a procedure.
3. Pick a diary date.
4. Confirm that available slots display.
5. Book a time.
6. Open `/admin`.
7. Select the same date.
8. Confirm the client booking appears in the admin diary.
9. Add a staff booking in `/admin`.
10. Return to `/book` and confirm that the booked time is no longer available.
11. Cancel/delete a booking in `/admin` and confirm the slot becomes available again.

## Git deploy commands

Use these after the local build passes:

```bash
git status
git add .
git commit -m "Booking System Ver-0.002 live diary availability foundation"
git push origin main
```

Netlify should automatically deploy from GitHub.

## Netlify settings

Base directory:

```text
Leave empty
```

Build command:

```text
npm run build
```

Publish directory:

```text
.next
```

## Database direction

The next database build should use Netlify Database instead of Supabase.

First dedicated dentist build:

- Dedicated Netlify Database for one dentist/client.
- Live bookings table.
- Procedures table.
- Working hours table.
- Blocked days/times table.
- Staff/client records.
- Notification settings and logs.
- Audit log.

Later SaaS expansion:

- Shared database with tenant/practice separation.
- Tenant subdomains.
- Optional custom domains.
- Practice-specific settings.
- Medical-data privacy and retention controls.

## Suggested next build

**Ver-0.003 — Netlify Database Foundation**

Connect the live diary model to Netlify Database migrations and server-side routes while preserving the current client/admin workflow.
