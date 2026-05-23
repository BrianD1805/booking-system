# ZipBook Ver-0.020 — Premium Booking Confirmation Wait State

This patch improves the client booking confirmation experience on slow internet connections.

## What changed

- Added a premium animated confirmation overlay while the app is checking the diary and saving the booking.
- The client now sees clear wording that the appointment is being confirmed and should keep the screen open.
- Booking errors now appear inside the booking popup instead of only appearing back on the home screen.
- Added an inline retry button within the booking popup if the booking confirmation fails.
- No database changes.

## Reason

Previously, slow internet could leave the client looking at “Checking diary…” with no strong visual feedback. If the request failed, the retry message could appear on the home page after the user closed the flow, which felt confusing. This patch keeps the feedback in the client’s current booking context.
