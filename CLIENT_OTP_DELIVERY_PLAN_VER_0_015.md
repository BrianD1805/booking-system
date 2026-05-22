# ZipBook Ver-0.015 — Replace Development OTP Display with Email/SMS Delivery Planning

## Purpose

Ver-0.015 removes the visible browser development OTP code from the client login flow. The login screen now behaves like a proper customer-facing OTP flow rather than showing the code inside the app.

## What Changed

- The browser no longer receives or displays `devCode`.
- The client app now shows a delivery message after requesting a login code.
- For local development, the OTP is logged in the `netlify dev` terminal only.
- The API response now returns delivery metadata only:
  - `deliveryMessage`
  - `deliveryMode`
  - `deliveryProvider`
  - `deliveryReady`
- The OTP audit log records delivery mode/provider readiness for later support/debugging.
- The real SMS/email provider connection is intentionally planned as the next stage.

## Local Testing

When running locally with `netlify dev`, request a code from the client login panel. The app will show a tasteful note telling the tester to check the terminal.

The terminal should show a line similar to:

```text
[ZipBook OTP] SMS code for +254***00: 123456 (OTP otp-...)
```

Use that code in the app to verify the login.

## Production Behaviour Until Providers Are Connected

In production, the code is not shown in the browser. If no SMS/email provider has been configured, the API will create the OTP record but report that the provider is not connected yet. This avoids leaking OTP codes to real clients while keeping the database/session foundation ready.

## Recommended Next Provider Order

1. Email delivery first, because it is cheaper and easier to test.
2. SMS delivery second, because phone-based login is better for dental booking clients.
3. Practice-level provider settings later, so each practice can choose email-only, SMS-only, or both.

## Suggested Providers To Consider

- Email: Resend, SendGrid, Mailgun, or Netlify Email/Functions if suitable.
- SMS: Twilio for broad international support, or country-specific providers later for UK, South Africa, and Kenya.

## Future Work

- Add environment variables for the selected email provider.
- Add branded email OTP template.
- Add SMS provider environment variables.
- Add rate limiting per phone/email/IP.
- Add resend cooldown timer in the UI.
- Add failed-attempt lockout rules.
- Add admin settings for OTP delivery method once multi-practice SaaS settings are introduced.
