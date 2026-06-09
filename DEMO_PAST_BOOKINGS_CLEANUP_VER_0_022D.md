# Ver-0.022D — Demo Past Bookings Cleanup

Purpose: allow Brian to clean old bookings before demoing ZipBook without deleting customers or future demo appointments.

## What changed

- Added a protected admin-data cleanup endpoint:
  - `GET /api/admin-data/bookings/past` checks how many bookings are dated before today.
  - `DELETE /api/admin-data/bookings/past?confirm=DELETE` removes only bookings where `booking_date < CURRENT_DATE`.
- Added a Demo cleanup panel to `/admin/data`.
- The cleanup keeps:
  - today's bookings
  - future bookings
  - customers
  - client accounts
  - sessions
  - OTP rows
- Added an audit-log row when the cleanup runs.
- No database migration is required.

## Safety note

This is intended for demo preparation only. It removes past booking rows permanently from the app database. It does not touch the locked client-facing home page.
