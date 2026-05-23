# ZipBook Ver-0.017 — Client App Login/Sign-up Separation

## Purpose
Separate the client app, admin app and landing page more clearly.

The client app should feel like a normal customer-facing booking app, not a development/admin dashboard.

## Client app direction
- Client app shows only customer-facing content.
- No admin wording, admin links, diary/debug information, or practitioner availability statistics on the client home screen.
- Main client actions are Login / Sign up and Book appointment.
- Existing clients log in with mobile number and password.
- New clients sign up with country, mobile number, email and password.
- OTP/code is used only for first-time sign-up verification.
- Returning clients should not need an OTP every time they log in.

## Account identity rule
- Mobile number remains the unique client account identifier.
- Client selects a country from the searchable country field.
- Client can type the local number when signing in.
- If the local number starts with 0, the leading zero is removed before storing/matching.
- Full international phone format is stored, for example +254712345678.

## Admin app direction
- Admin/reception booking must continue supporting customer search.
- Admin/reception can still book ad-hoc patients without requiring a client account.
- Client account login is only for the customer-facing app.

## Notes
Email verification code delivery remains the first provider foundation. SMS verification should replace or supplement this once an SMS provider is connected.
