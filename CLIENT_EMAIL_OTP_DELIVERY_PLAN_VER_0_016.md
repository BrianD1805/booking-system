# ZipBook Ver-0.016 — Email OTP Delivery Foundation

Ver-0.016 connects the first real OTP delivery channel before SMS.

## What changed

- Client login now requires a mobile number in full international format, for example `+254712345678`.
- The mobile number is treated as the unique client account identifier.
- Email is used as the first live OTP delivery channel.
- SMS OTP remains planned for the next provider stage.
- The client app no longer accepts email-only login as the account identity.
- Email can be reused by more than one client account, useful for families or reception/admin support cases.

## Email provider environment variables

Set these in Netlify when ready:

```text
RESEND_API_KEY=your_resend_api_key
ZIPBOOK_EMAIL_FROM=ZipBook <bookings@yourdomain.com>
ZIPBOOK_EMAIL_REPLY_TO=support@yourdomain.com
```

`ZIPBOOK_EMAIL_REPLY_TO` is optional.

## Local testing behaviour

If `RESEND_API_KEY` and `ZIPBOOK_EMAIL_FROM` are not set, local testing still works by printing the OTP code in the `netlify dev` terminal.

## SMS next step

The next SMS build should use the same phone identifier and switch the delivery channel to SMS when the SMS provider is configured. Email should remain available as a fallback/recovery channel.
