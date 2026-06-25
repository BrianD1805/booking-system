# ZipBook Ver-0.032 - Database Compute Guardrails

Purpose: reduce unnecessary Netlify Database wake-ups and compute usage while preserving the current demo/admin workflow.

Changes included:

- Removed the 10-second automatic booking polling from the shared booking hook.
- Diary, Reception and client booking now load once and then refresh only after a deliberate user action or after a booking/status/delete operation.
- Admin diary and Reception still have manual Refresh buttons.
- Added a small "Last refreshed" label beside the admin diary/reception refresh controls.
- Retained the lightweight 30-second browser clock update; this does not call the database.
- Added a short in-memory bootstrap cache on warm serverless instances to avoid repeatedly querying practice/procedure/practitioner settings.
- Added short in-memory admin settings cache, cleared after settings/procedure/practitioner changes.
- Added lightweight API route count logging in the Next proxy. Set `ZIPBOOK_API_ROUTE_LOGGING=0` to silence it.
- Updated `/api/tenant-context` so it stays DB-free, dynamic/no-store, and only includes the long diagnostic note when called with `?diagnostic=1`.

No database migration is required for this patch.

Important: Netlify Database sleep/scale settings should still be checked in the Netlify dashboard. The app can reduce unnecessary queries, but database compute behaviour also depends on the database's sleep and autoscale settings.
