# Booking System Ver-0.022C — Duration Slot Coverage Fix

## Purpose
Fix the demo-critical booking slot behaviour for treatments that are longer than the base 30-minute slot interval.

## What changed
- Availability now displays final short slots as unavailable instead of silently omitting them.
- Example: if the practice closes at 17:00 and a 45-minute treatment is selected, the 16:30 slot is shown as unavailable with a clear "Not enough time" reason.
- Selecting a longer appointment now visibly highlights every 30-minute diary block that the appointment covers.
- Example: selecting a 45-minute appointment at 10:00 highlights 10:00 and the next 10:30 block, making it clear the treatment runs beyond the first visible half-hour block.
- The same slot coverage display was applied to the client time picker and the admin/reception booking popup.
- Existing server-side conflict and working-hours protection remains in place.

## Version updates
- Visible app version bumped to Ver-0.022C.
- Service worker cache bumped to zipbook-v0.022C.
- Package version bumped to 0.0.22-c.

## Database
No database migration required.
