# ZippyWeb Booking System — Ver-0.006

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.006 — PWA Foundation and Dental Icon Setup**

This build keeps the existing live booking foundation and adds the PWA/browser icon foundation using the new friendly tooth app icon.

## What this build changes

- Adds the new dental app icon as PNG icons for PWA installs.
- Adds browser favicon files, Apple touch icon, maskable icons, and Open Graph browser/social image.
- Improves the client and admin manifests so both apps install cleanly from one domain.
- Adds an offline fallback page for the service worker.
- Updates metadata for browser titles, descriptions, sharing previews, and install behaviour.
- No booking table or API schema changes.

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

## Database migrations

Ver-0.006 does not add a new database migration. The existing `0003_slot_interval_30_minutes.sql` migration remains in place from the previous slot-interval build.

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
```

## Build check

```bash
npm run build
```

## Deploy

```bash
git status && git add . && git commit -m "Booking System Ver-0.006 PWA foundation and dental icons" && git push origin main
```


## Ver-0.005H note

This build restores the original `0001_booking_system_foundation.sql` migration exactly as it was before Netlify applied it in production. Netlify Database does not allow an already-applied migration file to be edited. The 30-minute slot change remains in `0003_slot_interval_30_minutes.sql`.

## Ver-0.006 note

This version sets up the PWA asset foundation using the new friendly tooth icon. It adds PNG app icons, maskable icons, favicon, Apple touch icon, Open Graph browser/social image, improved manifests for the client and admin apps, and an offline fallback page.

Important: do not edit existing applied Netlify Database migrations. New database changes must always be added as a new migration file.
