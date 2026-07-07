# ZipBook Ver-0.038A — Resend Email Delivery: Client Booking Confirmations

## Purpose

Ver-0.038A adjusts the Resend email delivery build so that booking confirmation emails are sent to the client, whether the client books themselves or admin/reception books on the client's behalf.

## What changed

- Client sign-up OTP emails are sent through Resend when ZIPBOOK_OTP_TEST_MODE is false.
- Client forgot-password OTP emails are sent through Resend when ZIPBOOK_OTP_TEST_MODE is false.
- Booking confirmation emails are sent to the client email address on the booking.
- Admin/reception-created bookings also send the confirmation to the client.
- Admin notification email sending has been removed from this build.
- Booking confirmation email failures do not stop the booking being created.
- Booking confirmation delivery status is written to audit_logs as booking_client_confirmation_email.

## Real ZipBook email values

- Sending subdomain: mail.zipbook.app
- From address: ZipBook <bookings@mail.zipbook.app>
- Reply-to address: info@zipbook.app

## SQL

No SQL migration is required for Ver-0.038A.

## Version bump

- Visible app version: Ver-0.038A
- Service worker cache: zipbook-v0.038A
- Package version: 0.0.38-a.0
