# Booking System Ver-0.051B — Practice Diary Logic

## Scope
- Corrected Open slots remaining so the All practitioners view counts every available clinician slot, not only each visible time block.
- Kept single-practitioner view counting only that clinician's available slots.
- Kept Upcoming bookings scoped to the selected practitioner filter, with All practitioners showing all upcoming bookings.
- Centred and enlarged the Practice Diary metric panel text.
- Improved live diary alerts so client-created, client-edited and client-deleted bookings are checked globally across all practitioners.
- Manual Refresh diary now also checks for client booking alerts, instead of only refreshing diary data.
- Alert polling no longer advances past a possibly delayed audit record when no alert is returned, reducing missed alert risk.

## SQL
No SQL required.
