# ZipBook / Booking System — Ver-0.060 (FULL programme ZIP)

Baseline: complete Ver-0.059 source. Retains Next.js 16.4.6, security protections, responsive popups, tenant RLS, staff diary and eager-loading public embed.

Changes:
- Owner-only Admin Settings panel to upload/replace/remove PNG, JPEG or WebP business logos (max 2 MB). Removes ambiguous manual Logo URL input; existing settings preserved.
- Secure, tenant-scoped Supabase bytea logo table with RLS; decoded imagery converted into a transparent 512x512 PNG using pinned sharp 0.35.5.
- Business-specific booking logo at existing two icon positions and branded install prompt copy, keeping approved page layout.
- Per-tenant PWA manifest (name and 192/512 icon) and iOS Apple-touch icon endpoint. Default ZipBook icon when unset.
- Logo endpoints are never service-worker cached; manifest + icon responses are no-store. Business and OS app caches may require reinstall to replace icons already installed.
- New test: npm run test:branding.

**SQL mandatory before deploy**: supabase/zipbook_business_branding_ver_0_060.sql; paste/rerun exact SQL from chat into Supabase SQL Editor.
**No other Supabase migration.**

Test locally with npm ci + all test scripts + npm audit --omit=dev + npm run typecheck + npm run build + netlify dev --no-open. For real business subdomain live validation, deploy after SQL and ensure Netlify reports Published. To verify: owner uploads logo; /book header + central logo; /api/branding/manifest has practice title and custom 192/512 icons; PWA installs with icon; another business still shows default; remove returns defaults; no staff role can upload. Installing an updated icon over an existing PWA may require removing and reinstalling the PWA.
