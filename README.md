# ZipBook — Ver-0.008B

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.008B — Booking Duration Lockdown**

This build keeps the existing Ver-0.008 client PWA install prompt and Ver-0.008A icon refresh, then tightens the diary display so longer bookings occupy every overlapping 30-minute diary block, not just the booking start time.

## What this build changes

- Updates the admin diary slots view to detect booking overlaps by time range.
- A 60-minute appointment now marks both half-hour diary blocks as booked/occupied.
- Longer appointments show as continuing until their real end time in the admin visual diary.
- Keeps the existing server-side conflict protection, which already checks full booking ranges before saving.
- Keeps the client PWA install prompt in place.
- Keeps the ZipBook wordmark favicon, PWA icons and Open Graph image in place.
- Updates the service worker cache name to `zipbook-v0.008b`.
- Updates the visible app version to `Ver-0.008B`.
- No database migration changes in this build.

## Domain plan

- `https://zipbook.app` — landing page.
- `https://zipbook.app/book` — client-facing booking app.
- `https://admin.zipbook.app` — owner/admin diary app.
- `https://bookings-system.netlify.app` — temporary Netlify URL / fallback during setup.
- Future SaaS route idea: `https://practice-name.zipbook.app` for tenant booking pages.

## App areas

- `/book` — client-facing booking app.
- `/admin` — owner/admin diary app.
- `/widget` — website iframe/embed starter.

## Important booking rule

This is a live booking system, not an appointment request system.

- A client can create a confirmed booking directly.
- Dentist/admin/staff can create a confirmed booking directly.
- Both apps use Netlify Database through API routes.
- Client-created bookings and staff-created bookings sync between both apps.
- Bookings are linked to a specific practitioner/resource.

## Local Program Files workflow

Place/update files in your local Program Files folder, for example:

```text
C:\01 My Work 2026\Booking System\Booking System Program Files
```

Open the terminal directly from that folder.

## Local testing

Use Netlify Dev for database/API testing:

```bash
netlify dev
```

Open:

```text
http://localhost:8888/book
http://localhost:8888/admin
http://localhost:8888/widget
```

## Build check

```bash
npm run build
```

## Deploy

```bash
git status && git add . && git commit -m "Booking System Ver-0.008B booking duration lockdown" && git push origin main
```

## Migration safety note

Do not edit existing applied Netlify Database migrations. New database changes must always be added as a new migration file.
