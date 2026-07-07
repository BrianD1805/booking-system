# ZipBook Ver-0.038 — Resend Email Delivery

This build connects ZipBook email delivery through Resend for:

- Client sign-up verification OTP emails.
- Client password reset OTP emails.
- Admin notification emails when a new booking is created.

## Runtime behaviour

- The shared email sender lives in `lib/emailDelivery.ts`.
- OTP delivery now uses the shared Resend sender in `lib/otpDelivery.ts`.
- Sign-up OTPs use the `signup` email copy.
- Password reset OTPs use the `password-reset` email copy.
- Login OTPs still use the `login` email copy if that route is used again later.
- New bookings now send an admin notification email after the booking is safely written to Supabase.
- Admin notification delivery is recorded in `audit_logs` as `booking_admin_notification`.
- Failed admin notification email delivery does not stop the booking from being created.

## Required Netlify environment variables

Add these in Netlify Site configuration > Environment variables:

- `RESEND_API_KEY` — Resend API key.
- `ZIPBOOK_EMAIL_FROM` — verified Resend sender, for example `ZipBook <bookings@mail.zipbook.app>`.
- `ZIPBOOK_EMAIL_REPLY_TO` — optional reply-to address.
- `ZIPBOOK_ADMIN_NOTIFICATION_EMAIL` — admin notification recipient. Comma-separate multiple recipients.

`RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, and `ZIPBOOK_ADMIN_EMAIL` are supported as fallbacks, but the preferred ZipBook names above should be used going forward.

## OTP test mode

For live Resend testing, remove or set this to false:

- `ZIPBOOK_OTP_TEST_MODE=false`

If `ZIPBOOK_OTP_TEST_MODE=true`, OTPs stay in temporary test mode and are shown on screen instead of being sent as real emails.

## SQL

No SQL migration is required for Ver-0.038.

## Version bump

- Visible app version: Ver-0.038
- Service worker cache: zipbook-v0.038
- Package version: 0.0.38


## Superseded adjustment

Ver-0.038A changes booking emails from admin notifications to client booking confirmations. Use Ver-0.038A as the active patch.
