# ZipBook Ver-0.014 — Client OTP Login Flow Foundation

## Purpose
This patch turns the client login placeholder into a working OTP-style foundation for the customer-facing app only.

## What this version includes
- Client login panel can request a one-time login code using mobile number or email.
- Verification code step is now wired to server API routes.
- A lightweight client session is stored locally on the device after successful verification.
- Signed-in clients can see a simple list of their recent appointments.
- Signed-in booking links the new booking to the same customer record.
- Guest booking remains available and untouched.
- Admin booking remains separate and still supports existing customer search or ad-hoc patient booking.

## Development delivery mode
Real SMS/email delivery is not connected yet. For local testing, the API returns a development preview code and the UI displays it as a temporary development code. This must be replaced with a real SMS/email provider before live patient login is enabled.

## Database changes
New migration added:

```text
netlify/database/migrations/0005_client_otp_login_foundation.sql
```

It adds:
- `client_login_otps`
- `client_sessions`

Do not edit old migrations. Apply this new migration locally and let Netlify apply it during deployment.

## Next recommended upgrade
Ver-0.015 should connect real OTP delivery, most likely SMS first with email fallback. It should also add rate limiting, clearer privacy copy, and admin controls for enabling/disabling client login per practice.
