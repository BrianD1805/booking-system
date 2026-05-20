# ZipBook — Ver-0.007

From Brian Hallam at ZippyWeb.

## Current build

**Ver-0.007 — Domain Split Foundation**

This build prepares ZipBook for the new production domain and separates the client-facing app from the admin app while keeping one shared codebase, one GitHub repo, one Netlify project, and one shared Netlify Database foundation.

## Domain plan

- `https://zipbook.app` — client-facing booking app.
- `https://admin.zipbook.app` — owner/admin diary app.
- `https://bookings-system.netlify.app` — temporary Netlify URL / fallback during setup.
- Future SaaS route idea: `https://practice-name.zipbook.app` for tenant booking pages.

## What this build changes

- Adds domain-aware routing middleware.
- `zipbook.app` opens the client booking app at the root domain.
- `admin.zipbook.app` opens the admin diary app at the root of the subdomain.
- `/admin` on the main ZipBook domain redirects to the admin subdomain.
- `/book` on the admin subdomain redirects back to the client domain.
- Localhost and the temporary Netlify URL continue to work with `/book`, `/admin`, and `/widget` for testing.
- Updates metadata, browser titles, manifest IDs, PWA start URLs and app names for ZipBook.
- Keeps the client and admin apps as separate installable PWAs from their own domains/subdomain.
- Keeps the same Netlify Database, booking API, procedures, practitioners, conflict checks and slot logic.
- No database migration changes in this build.

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

## SaaS direction

The current version is still suitable for a dedicated dentist/practice database. The domain structure now keeps us ready for a SaaS expansion later, where tenant booking pages can use subdomains such as `practice-name.zipbook.app` while the owner/admin system remains separated at `admin.zipbook.app`.

## Netlify custom domain setup notes

In Netlify, add these domains to the same site first:

```text
zipbook.app
www.zipbook.app
admin.zipbook.app
```

Later, when we are ready for tenant SaaS subdomains, add:

```text
*.zipbook.app
```

Do not add the wildcard until the product is ready for tenant routing.

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
git status && git add . && git commit -m "Booking System Ver-0.007 domain split foundation" && git push origin main
```

## Migration safety note

Do not edit existing applied Netlify Database migrations. New database changes must always be added as a new migration file.
