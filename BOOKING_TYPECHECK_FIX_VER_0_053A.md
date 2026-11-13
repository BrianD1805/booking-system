# ZipBook Ver-0.053A — TypeScript corrections

Starting point: the complete Ver-0.053 project ZIP.

## Corrections

1. `app/admin/page.tsx`: `bookingHasPassed()` accepts an optional practice timezone, consistent with `PracticeSettings.timezone?` and the `bookingStartIsPast()` function's default timezone fallback. Fixes both TS2345 errors while keeping existing diary logic.
2. `app/admin/reception/page.tsx`: the two client-search choice labels are static inside `!selectedCustomer` and no longer access properties of a variable TypeScript has already narrowed to `null`. Fixes three TS2339 errors while retaining selected-client heading/card and Step 2 behaviour.
3. Consistent `Ver-0.053A` application version and PWA cache bump. NPM package/lockfile version uses valid semver `0.0.53-a`.

No Supabase SQL change. Ver-0.053 booking-time safeguards and search improvements are retained.

## Local validation

```
npm install
if exist .next rmdir /s /q .next
npm run test:heartbeat
npm run test:booking-time
npm run typecheck
npm run build
netlify dev --no-open
```

Run the Git command only if the test/build checks succeed.
