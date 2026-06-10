# ZipBook Ver-0.028C - Clients Page Separate Edit Flow

## Summary
This patch polishes the Clients admin area after Ver-0.028.

## Changes
- `/admin/data` remains the main Clients search/list page.
- Search results are now one-line rows showing only full name and phone number.
- Clicking a client opens a separate edit page at `/admin/data/[client-id]`.
- Add client now opens `/admin/data/new`.
- Saving a new or edited client returns to the Clients page.
- Notification preference buttons are explicit: blue means selected, white means not selected.
- Added `GET /api/admin-data/customers/[id]` for loading one client by ID.

## Notes
- No new database migration required.
- Client-facing home page remains locked and unchanged.
