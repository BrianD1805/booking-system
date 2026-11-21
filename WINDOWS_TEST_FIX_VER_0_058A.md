# ZipBook Ver-0.058A — Windows Tenant Test Fix

**Baseline:** Full Ver-0.058 website-integration project.

## Correction
The Ver-0.056 tenant-boundary test classified platform API routes with POSIX-only `/api/platform/` detection. Windows filesystem paths use backslashes, so `app\api\platform\accept\route.ts` was mistakenly checked for `withTenantRequest` rather than `withPlatformRequest` and the test failed.

The test now uses cross-platform route detection matching both separators. Added a regression test for Windows and Unix paths. The application security wrappers have not been changed; platform routes continue using `withPlatformRequest` while tenant routes use `withTenantRequest`.

## Testing
Run `npm run test:tenants`, all other test scripts, `npm run typecheck`, and `npm run build` locally before deployment. `npm ci` should succeed using the unchanged resolved dependency versions in the lockfile. No new Supabase SQL or environment variables required; apply the Ver-0.058 SQL if not already done.
