# Ver-0.027 — Admin Booking Flow Statuses and Past Slot View

## Scope
- Reworked the admin diary action buttons to match the reception workflow.
- Added statuses: Confirmed, Arrived, Completed, Billing, Cancelled.
- Added Billing as a placeholder status to be linked to a billing module later.
- Added a 12-hour clock beside the diary Refresh button.
- Greyed out slots/bookings whose time has already passed on the selected date.
- Removed passed available slots from the open slot total.

## Database
Adds migration `0010_booking_status_flow.sql` to extend the booking status check constraint.

## Notes
- Cancelled bookings still release the slot because availability ignores cancelled bookings.
- Delete removes the booking from the diary.
- Client-facing home page was not changed.
