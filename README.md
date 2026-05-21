# ZipBook — Ver-0.008

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.008 — Client PWA Install Prompt**

This build keeps the existing Ver-0.007 domain split foundation and Ver-0.007A favicon/app icon refresh, then adds a client-facing install prompt for the booking app.

## What this build changes

- Adds a tasteful **Install ZipBook** prompt to the client booking app only.
- Uses the browser `beforeinstallprompt` event where supported, mainly Android/Chrome/Brave/Edge and compatible desktop browsers.
- Adds a clear **Install App** button when the browser allows the native install prompt.
- Adds a **Not now** button so clients are not repeatedly nagged after dismissing it.
- Adds iPhone/Safari guidance: tap Share, then Add to Home Screen.
- Hides the prompt when the app is already installed or running in standalone PWA mode.
- Updates the client manifest start URL to `/book`, so the client PWA opens directly into the booking app rather than the landing page.
- Updates the service worker cache name to `zipbook-v0.008`.
- Updates the visible app version to `Ver-0.008`.
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
git status && git add . && git commit -m "Booking System Ver-0.008 client PWA install prompt" && git push origin main
```

## Migration safety note

Do not edit existing applied Netlify Database migrations. New database changes must always be added as a new migration file.
