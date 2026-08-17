# Booking System Ver-0.050 — Booking Edit/Delete and Live Diary Alerts

## Scope

Ver-0.050 adds booking edit/delete workflows for the admin diary and signed-in client booking app.

## Included

- Admin can edit an existing booking from the diary list.
- Admin can delete an existing booking from the diary list.
- Signed-in app users can edit future bookings from My account.
- Signed-in app users can delete future bookings from My account.
- Past bookings cannot be edited/deleted by the app user.
- Edit checks diary availability and excludes the booking being edited from its own clash check.
- Client booking changes are recorded in the audit log.
- Client edit/delete changes trigger a live diary alert popup on the admin diary page.
- Admin diary checks for client booking changes every 30 seconds while the page is visible.
- Phone-only admin push alerts can be activated on supported mobile devices.
- Desktop/laptop admin devices use the live diary popup rather than push notifications.
- Client booking change push notifications remain phone-only.
- Failed push delivery does not block booking edits/deletes.

## SQL required

Run `supabase/zipbook_admin_push_notifications_ver_0_050.sql` once in Supabase before testing admin phone push alerts.

## No Netlify variables added

Ver-0.050 uses the existing VAPID variables from Ver-0.048:
- ZIPBOOK_VAPID_PUBLIC_KEY
- ZIPBOOK_VAPID_PRIVATE_KEY
- ZIPBOOK_PUSH_CONTACT
