# Build Ver-0.048 — Client Push Notifications

## Scope

Adds browser push notifications to the ZipBook user booking app.

## Included

- Client-side push notification activation panel in My account.
- Push subscription API for signed-in client accounts.
- Push public-key API for the booking app.
- Service worker push and notification click handling.
- Booking confirmation push sent to the client when a booking is created.
- Works for client-created bookings and admin/reception-created bookings where the booking is linked to a client/customer.
- Failed or unavailable push delivery does not stop booking creation.
- Audit entry for client push subscription save/disable.
- Audit entry for booking client push notification delivery attempts.

## Required Supabase SQL

Run `supabase/zipbook_push_notifications_ver_0_048.sql` in Supabase SQL Editor.

## Required Netlify variables

- ZIPBOOK_VAPID_PUBLIC_KEY
- ZIPBOOK_VAPID_PRIVATE_KEY
- ZIPBOOK_PUSH_CONTACT

Recommended contact value: `mailto:bookings@mail.zipbook.app`.

## Version references

- Visible app version: Ver-0.048
- Service worker cache: zipbook-v0.048
- package.json version: 0.0.48

## Notes

The implementation uses Node's built-in crypto and the browser Web Push APIs, so no new npm package is required.
