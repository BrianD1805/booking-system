# ZipBook Ver-0.017C — Remove Temporary Cleanup Tool

This patch removes the temporary Brian test-data cleanup endpoint introduced in Ver-0.017B.

## Removed

- `app/api/admin/cleanup-brian-test-data/route.ts`
- The Ver-0.017B cleanup note file

## Kept

- Client app login/sign-up separation
- Client phone-number account identifier logic
- Admin customer search and ad-hoc patient booking
- Existing database migrations and customer data structure

## Database changes

No database migration changes.
