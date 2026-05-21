# ZipBook — Ver-0.007A

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.007A — Favicon and App Icon Refresh**

This build keeps the existing Ver-0.007 domain split foundation and updates the ZipBook favicon, browser icon, PWA icons, Apple touch icon, SVG fallback icon, and Open Graph sharing image using the supplied calendar/check artwork.

## What this build changes

- Replaces the browser favicon with the supplied ZipBook calendar/check icon.
- Replaces all generated PWA app icon sizes used by both the client app and the admin app.
- Replaces the Apple touch icon for iPhone/iPad home screen installs.
- Replaces the Open Graph image used when the app is shared in WhatsApp/social previews.
- Keeps the supplied artwork visually unchanged, only resized into the required icon dimensions.
- Updates the service worker cache name to `zipbook-v0.007a` so browsers and installed PWAs can pick up the refreshed assets.
- Updates the visible app version to `Ver-0.007A`.
- No database migration changes in this build.

## Domain plan

- `https://zipbook.app` — client-facing booking app.
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
git status && git add . && git commit -m "Booking System Ver-0.007A favicon and app icon refresh" && git push origin main
```

## Migration safety note

Do not edit existing applied Netlify Database migrations. New database changes must always be added as a new migration file.
