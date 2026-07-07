# ZipBook Ver-0.036A — Temporary Client OTP Test Mode

Adds a temporary OTP testing mode for client sign-up, login-code and password-reset flows while Resend/email delivery is not configured yet.

## Environment variable

Set this only while testing:

```text
ZIPBOOK_OTP_TEST_MODE=true
```

When enabled, the API response includes the one-time code and the client popup displays it on screen. The OTP is still stored hashed in `client_login_otps`, expires after the normal timeout, and is still verified through the normal verification route.

## Safety

Remove or set `ZIPBOOK_OTP_TEST_MODE=false` before public/client testing once Resend is configured.

## Version

- Visible app version: Ver-0.036A
- Service worker cache: zipbook-v0.036a
- Package version: 0.0.36-a
