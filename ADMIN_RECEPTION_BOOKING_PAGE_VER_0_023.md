# Ver-0.023 — Admin Reception Booking Page

Purpose: replace the unreliable admin popup booking route with a proper full-page receptionist workflow.

## What changed

- Added a new full-page admin booking route at `/admin/reception`.
- The main admin diary `Add booking` button now opens the reception booking page instead of the popup.
- Added a receptionist-focused client search panel:
  - search by name, phone or email
  - select an existing client
  - show whether the client has a login account
  - switch to ad-hoc patient mode when required
- Added full-page appointment selection:
  - date
  - procedure
  - practitioner or first available
  - duration-aware available slots
  - covered slot highlight for longer procedures
- Added a clear confirmation/save panel with optional reception notes.
- Existing `/api/customers` search and `/api/bookings` create booking APIs are reused.
- No database migration is required.

## Important rules preserved

- Client-facing home page remains locked and unchanged.
- Ver-0.021 popup styling remains untouched for client popups.
- The old admin popup is no longer the entry point for adding bookings.
