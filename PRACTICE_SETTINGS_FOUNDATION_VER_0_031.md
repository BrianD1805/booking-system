# Ver-0.031 — Practice Settings Foundation

This build adds the first admin-facing practice settings layer after the SaaS tenant foundation.

## Added

- Admin settings page at `/admin/settings`.
- Settings entry in the admin mega menu.
- Editable practice profile foundation:
  - practice name
  - public display name
  - address
  - phone
  - email
  - timezone
  - currency
  - country
  - logo URL placeholder
  - booking app URL display
- Working hours foundation:
  - open/closed days
  - open time
  - close time
  - lunch break placeholder fields
- Booking rules foundation:
  - slot interval
  - minimum notice hours
  - max days ahead
  - same-day bookings flag
  - cancellation/reschedule note placeholder
- Procedure management:
  - add/edit/delete or deactivate procedures
  - duration
  - price/billing placeholder
  - active/inactive
  - display order
- Practitioner management:
  - add/edit/delete or deactivate practitioners
  - role
  - active/inactive
  - display order
  - procedure capability links
- Audit logging for settings, procedure and practitioner changes.

## Database

New migration:

`netlify/database/migrations/0013_practice_settings_foundation.sql`

This migration extends the existing `practices` table. It does not remove or alter existing demo data.

## Important

The `/book` client-facing home page remains locked and unchanged in this build. The settings are now editable, but the next build should carefully decide which settings start driving visible client app branding and availability.
