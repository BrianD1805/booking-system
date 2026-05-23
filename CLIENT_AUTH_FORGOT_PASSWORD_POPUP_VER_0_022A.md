# ZipBook Ver-0.022A — Forgot Password Popup Polish

## Scope

Ver-0.022A keeps the locked client-facing home page unchanged and adjusts the forgot-password flow so it opens in its own premium popup rather than becoming an inline state inside the login/sign-up popup.

## Changes

- Added a dedicated password reset popup using the same client auth popup card, sticky header, internal body scrolling and sticky bottom action layout.
- The login popup now remains focused on Login / Sign up only.
- Clicking **Forgot password?** closes the login popup and opens the reset popup.
- Reset request and reset confirmation still use the Ver-0.022 password reset API foundation.
- Back to login returns to the login popup cleanly.
- Visible version bumped to Ver-0.022A and service worker cache bumped to zipbook-v0.022A.

## Database

No migration required. This uses the existing OTP/session/password reset foundation added in Ver-0.022.
