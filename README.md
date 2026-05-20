# ZippyWeb Booking System — Ver-0.005G

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.005G — 30 Minute Booking Slots**

This build keeps the existing live booking foundation and adjusts the appointment slot grid from 15-minute increments to 30-minute increments.

## What this build changes

- Client and admin diary slots now step in **30-minute intervals**.
- The setting is still stored as `slot_interval_minutes` so it can become a per-tenant setting later.
- A new migration updates the current demo practice to `30` minutes.
- Fallback/demo settings now also use `30` minutes for fresh installs.
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

This build adds:

```text
0003_slot_interval_30_minutes.sql
```

Apply it locally with:

```bash
netlify database migrations apply
```

Netlify should apply it automatically during the GitHub deploy.

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
git status && git add . && git commit -m "Booking System Ver-0.005G 30 minute booking slots" && git push origin main
```
