# ZippyWeb Booking System — Ver-0.001A Foundation

Prepared by Brian Hallam at ZippyWeb.

## What this patch includes

- Next.js App Router project foundation.
- Two app areas from one domain:
  - `/book` — client-facing appointment booking PWA.
  - `/admin` — owner/admin diary management PWA.
- `/widget` — starter HTML iframe embed code for an existing website.
- Mock procedures and mock bookings in `lib/mockData.ts`.
- Basic PWA manifest files for the client app and admin app.
- Service worker cache name bumped to `zippyweb-booking-system-v0.001`.
- Netlify config file for GitHub-connected deploys.

## Local setup

Open Command Prompt or PowerShell in the project folder and run:

```bash
npm install
npm run dev
```

Then test:

```text
http://localhost:3000/
http://localhost:3000/book
http://localhost:3000/admin
http://localhost:3000/widget
```

## Local pre-deploy checks

```bash
npm run typecheck
npm run build
```

## Git deploy commands

```bash
git status
git add .
git commit -m "Booking System Ver-0.001A foundation"
git push origin main
```

Netlify should build from GitHub using:

```text
Build command: npm run build
Publish directory: .next
```

## Next planned patch

Ver-0.002 should add the first real data model plan and Supabase SQL foundation for:

- Tenants / practices.
- Procedures and default duration.
- Bookings.
- Blocked days / leave.
- Notification preferences.
- Client records.
- Audit log events.

Keep the first dentist build as a dedicated database option, while designing the schema so it can later move into a shared SaaS Supabase database with strict tenant separation.


## Ver-0.001A note

This full program-files ZIP refreshes the original foundation and removes the deprecated TypeScript `baseUrl` compiler option so `npm run typecheck` can pass with newer TypeScript versions.
