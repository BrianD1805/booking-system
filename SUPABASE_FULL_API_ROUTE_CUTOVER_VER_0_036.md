# ZipBook Ver-0.036 — Supabase Full API Route Cutover

Purpose: complete the first real runtime cutover stage so ZipBook can run the full app against Supabase when `DATABASE_PROVIDER=supabase` is set, while keeping Netlify Database as the fallback/default until production cutover is approved.

## What changed

- Confirmed the remaining server database calls are routed through the shared database provider layer.
- Kept Netlify Database as the default provider unless `DATABASE_PROVIDER=supabase` is explicitly set.
- Enhanced `/api/database-health` with a Supabase cutover status section.
- Added optional smoke checks at `/api/database-health?smoke=1` to verify the core tables needed by the full app exist in the active database.
- Added masked connection-string output so diagnostics do not expose the database password.
- No database migration is required.

## How to test locally against Supabase

Set these in the same terminal before running the app:

```bash
set DATABASE_PROVIDER=supabase
set SUPABASE_DB_POOLER_URL=postgresql://postgres.ucwkwtfpqsxtzielruuy:YOURDATABASEPASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
set SUPABASE_DB_SSL=1
```

Then run:

```bash
npm run build
netlify dev
```

Open:

```text
http://localhost:8888/api/database-health
http://localhost:8888/api/database-health?smoke=1
```

Expected:

```json
"provider": "supabase",
"ok": true,
"fullApiProviderLayer": true,
"remainingDirectNetlifyRoutes": 0
```

Then test the main app routes:

- `/`
- `/book`
- `/admin`
- `/admin/reception`
- `/admin/data`
- `/admin/settings`
- `/admin/staff`
- `/admin/audit`

## Important

Do not delete Netlify Database yet. Production cutover should happen only after local Supabase testing passes.
