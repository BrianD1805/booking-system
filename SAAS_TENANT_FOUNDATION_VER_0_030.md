# Ver-0.030 — SaaS Tenant Foundation

Purpose: add the first proper SaaS tenant/practice foundation while keeping the existing single-practice demo working exactly as before.

## What this adds

- New migration `0012_saas_tenant_foundation.sql`.
- Extends `practices` with tenant/SaaS fields:
  - `tenant_slug`
  - `public_booking_path`
  - `client_app_url`
  - `admin_app_url`
  - `admin_subdomain`
  - `primary_domain`
  - `custom_domain`
  - owner contact fields
  - tenant/subscription/plan status fields
  - timezone, locale, currency and country fields
  - onboarding status
- Adds `tenant_domains` for future host/path/domain mapping.
- Backfills the existing demo practice as `practice_001` / `zippy-dental-demo`.
- Adds `lib/tenant.ts` as the future tenant resolver foundation.
- Adds `/api/tenant-context` as a simple diagnostic endpoint for the current resolved tenant context.
- Replaces the hard-coded database practice constant with `getDefaultPracticeId()`, currently defaulting to `practice_001`.

## Important scope boundary

This patch does not convert every route into a full multi-tenant runtime yet. It creates the database and code foundation so that later builds can safely add:

- owner platform dashboard
- practice onboarding
- tenant-specific `/book/<slug>` or subdomain routing
- subscription/payment status
- strict tenant isolation checks for every admin/client request
- custom domains

## Current behaviour preserved

- `/` remains the public ZipBook landing page.
- `/book` remains the locked client booking PWA.
- `/admin` remains the admin system.
- Existing demo data remains under `practice_001`.
