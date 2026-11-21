# ZipBook — Ver-0.058D (Full Program Files Baseline)

This is a **complete source-programme ZIP**, not an overlay. It consolidates Ver-0.058 through Ver-0.058C into one self-contained Program Files baseline, retaining all prior bug fixes and security dependency upgrades. There are no new features and no additional database migrations in this repackaging release.

## Included
- Multi-business onboarding, isolation, practice diary, clients, scheduling and heartbeat functions.
- Website integration with authorised domains and public/staff iframe snippets (Ver-0.058).
- Windows-path tenant regression test fix (Ver-0.058A).
- Netlify-safe embed-policy API and no PostgreSQL import from Next.js Proxy (Ver-0.058B), plus TypeScript declarations.
- Working website authorisation POST Origin validation (Ver-0.058C).
- Exact deployed security-patched dependency versions, including Next.js **16.4.6**. `package.json` and `package-lock.json` are both included and aligned to `0.0.58-d`.
- Visible version and service worker updated to **Ver-0.058D**.

## Installation
Unzip the archive directly into your existing Booking System Program Files directory, overwriting the existing programme files. Keep your local `.env` configuration (not distributed). `node_modules` and `.next` are generated locally by `npm ci` / `npm run build` and are deliberately not included.

## Local verification (Windows CMD)
```
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm audit --omit=dev && npm run typecheck && npm run build
```

## Deployment (separate, after all checks pass)
```
git status && git add -A && git commit -m "Booking System Ver-0.058D Full Programme Baseline" && git push origin main
```

**Supabase SQL:** No new migration needed. The original Ver-0.058 website integration migration remains necessary for a fresh installation.
**Netlify environment:** No new variables.
**Status:** 52 Node.js automated tests passed during assembly and the ZIP integrity check passed. Local npm dependency installation, TypeScript build, and Netlify production operation should be verified on your laptop after extraction and before deployment.
