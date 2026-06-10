# Ver-0.024A — Admin Staff Login Build Fix

Fixes a TypeScript narrowing issue in `components/admin/AdminAuthGate.tsx` where the signed-in staff bar could still see `staff` as possibly null during the production build type-check.

No database migration required beyond the Ver-0.024 migration.

Client-facing home page remains locked and unchanged.
