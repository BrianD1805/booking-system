# ZipBook — Ver-0.008A

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.008A — ZipBook Wordmark Icon Refresh**

This build keeps the existing Ver-0.008 client PWA install prompt and updates the browser favicon, client PWA icon, admin PWA icon, Apple touch icon and Open Graph sharing image to the new blue **Zip Book** wordmark artwork.

## What this build changes

- Replaces the browser favicon with the new Zip Book wordmark icon.
- Replaces the client PWA icons used by `manifest-client.json`.
- Replaces the admin PWA icons used by `manifest-admin.json`.
- Replaces the Apple touch icon.
- Replaces the Open Graph image with a square 1200 × 1200 image.
- Keeps the artwork square and preserves the bleed area around the wordmark.
- Keeps the Ver-0.008 client install prompt in place.
- Updates the service worker cache name to `zipbook-v0.008a`.
- Updates the visible app version to `Ver-0.008A`.
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
git status && git add . && git commit -m "Booking System Ver-0.008A ZipBook wordmark icon refresh" && git push origin main
```

## Migration safety note

Do not edit existing applied Netlify Database migrations. New database changes must always be added as a new migration file.
