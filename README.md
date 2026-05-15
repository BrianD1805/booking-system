# ZippyWeb Booking System — Ver-0.003A

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.003A — Netlify Database Foundation**

This build keeps the two installable app areas from one domain:

- `/book` — client-facing booking app
- `/admin` — owner/admin app
- `/widget` — website iframe/embed starter

## Important booking rule

This is a live booking system, not an appointment request system.

- A client can create a confirmed booking directly.
- Dentist/admin/staff can create a confirmed booking directly.
- Both apps now use API routes designed to read/write through Netlify Database.
- Client-created bookings and staff-created bookings must sync between both apps.
- Request/approval wording should not be used unless a future practice setting enables it.

## What Ver-0.003A adds

- Adds `@netlify/database` to the project dependencies.
- Adds a Netlify Database migration at `netlify/database/migrations/0001_booking_system_foundation.sql`.
- Adds API routes:
  - `/api/bootstrap` — loads practice settings, procedures and blocked diary records.
  - `/api/bookings` — lists and creates live bookings.
  - `/api/bookings/[id]` — updates booking status or deletes a booking.
- Replaces browser localStorage booking storage with database API calls.
- Adds 10-second client/admin diary refresh polling.
- Keeps the availability engine from Ver-0.002.
- Updates app version to **Ver-0.003A**.
- Updates service worker cache to `zippyweb-booking-system-v0.003`.

## Local Program Files workflow

Unzip this ZIP and copy/replace the contents into your existing local **Booking System Program Files** folder.

Open the terminal directly from the Program Files folder.

Because this version adds a new database package, run:

```bash
npm install
```

Then make sure your project is linked to the Netlify site:

```bash
netlify link
```

If Netlify CLI is not installed yet:

```bash
npm install -g netlify-cli
netlify login
netlify link
```

## Netlify Database local setup

Netlify Database requires Netlify CLI 26.0.0 or later and Node.js 20.12.2 or later.

Check your CLI version:

```bash
netlify --version
```

Initialise Netlify Database for this project:

```bash
netlify database init
```

When asked about sample data, you can decline because this project already includes its own migration and seed data.

Apply the local migration:

```bash
netlify database migrations apply
```

Check database status:

```bash
netlify database status
```

Optional quick database check:

```bash
netlify database connect --query "SELECT id, name FROM practices;"
```

## Local testing

For this database-backed build, use Netlify Dev so API/database environment behaviour is closer to Netlify:

```bash
netlify dev
```

Netlify Dev normally opens around:

```text
http://localhost:8888/
```

Check:

```text
http://localhost:8888/
http://localhost:8888/book
http://localhost:8888/admin
http://localhost:8888/widget
```

You can still use Next dev for visual-only work, but database calls may not work unless the Netlify Database local environment is available:

```bash
npm run dev
```

## TypeScript and production build check

Run:

```bash
npm run typecheck
```

Then:

```bash
npm run build
```

## Local test checklist

1. Open `/book`.
2. Choose a procedure.
3. Pick a diary date.
4. Confirm that available slots display from database-backed practice settings.
5. Book a time.
6. Open `/admin`.
7. Select the same date.
8. Confirm the client booking appears in the admin diary.
9. Add a staff booking in `/admin`.
10. Return to `/book` and confirm that the booked time is no longer available.
11. Cancel/delete a booking in `/admin` and confirm the slot becomes available again.
12. Use the refresh button if you want to force a diary reload immediately.

## Git deploy commands

Use these after local database testing and build checks pass:

```bash
git status
git add .
git commit -m "Booking System Ver-0.003A Netlify Database foundation"
git push origin main
```

Netlify should automatically deploy from GitHub.

## Netlify production deployment notes

Netlify Database applies migrations automatically from:

```text
netlify/database/migrations
```

On production deploys, Netlify applies the migration before the deploy is published. If the migration fails, the deploy should not publish.

Netlify settings:

```text
Base directory: leave empty
Build command: npm run build
Publish directory: .next
```

Node version is pinned in `netlify.toml`:

```text
20.12.2
```

## Database tables in this foundation

- `practices`
- `procedures`
- `bookings`
- `blocked_dates`
- `blocked_times`
- `notification_settings`
- `notification_logs`
- `late_messages`
- `embed_settings`
- `audit_logs`

## Dedicated dentist first, SaaS later

This build is deliberately shaped for one dedicated dentist database first. Later SaaS expansion should add stronger tenant/practice separation, custom domains, subdomain routing, staff roles, patient login, consent/data-retention controls and stricter medical-data handling.

## Suggested next build

**Ver-0.004 — Booking Conflict Protection and Settings Admin**

Add server-side conflict checking before inserts, then begin building editable settings for procedures, working hours, blocked dates and blocked times.


## Ver-0.003A notes

- Keeps `lib/useLiveBookings.ts` as a compatibility wrapper so old local-storage imports cannot break TypeScript builds after Windows overwrites files.
- Fixes database date mapping by selecting DATE fields as plain text from Postgres, avoiding timezone display shifts such as `2026-05-17T21:00:00.000Z` for a `2026-05-18` diary date.
- Adds migration `0002_multi_practitioner_prep.sql` to prepare for multiple dentists/practitioners per practice.
