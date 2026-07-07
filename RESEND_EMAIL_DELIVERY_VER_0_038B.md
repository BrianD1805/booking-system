# ZipBook Ver-0.038B — Client Booking Refresh After Confirmation

Ver-0.038B fixes the client app refresh behaviour after a booking is confirmed.

## Problem fixed

After creating a booking and clicking Back to app from the confirmation screen, the client account booking list did not show the new booking until the browser page was manually refreshed.

## Change made

- The success screen now uses a Back to app button instead of navigating away to the public home page.
- Returning from the success screen refreshes the live booking data.
- If the client is signed in, returning from the success screen also refreshes the client session/profile so the newly created booking appears in the client account booking list immediately.
- The refresh is non-blocking for the confirmed booking itself; a temporary profile-refresh failure will not undo or hide the confirmed appointment screen.

## Version bump

- Visible app version: Ver-0.038B
- Service worker cache: zipbook-v0.038B
- package.json: 0.0.38-b.0

## SQL

No SQL migration is required for Ver-0.038B.
