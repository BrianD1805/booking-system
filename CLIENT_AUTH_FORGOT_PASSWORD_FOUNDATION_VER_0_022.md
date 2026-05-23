# Ver-0.022 — Client Login/Sign-up Polish and Forgot Password Foundation

Client-facing home page remains locked and unchanged.

## Built
- Added a clean "Forgot password?" link inside the client account popup login form.
- Added a password reset request stage that asks for country, mobile number and saved email address.
- Added a reset-code stage where the client enters the one-time code and a new password.
- Added password reset API endpoints:
  - `/api/client-login/password-reset/request-code`
  - `/api/client-login/password-reset/confirm`
- Reused the existing OTP delivery foundation and local Netlify dev terminal preview mode.
- Reset completion updates the saved password hash, revokes older client sessions, creates a fresh session and signs the client in.
- Added audit log entries for reset-code request and reset completion.
- Kept popup behaviour aligned with the Ver-0.021 styling standard: centred popup, sticky header/actions, internal scrolling and no horizontal drift.
- Bumped visible app version and service worker cache to Ver-0.022.

## Notes
- No database migration was required for this foundation because the existing `client_login_otps`, `client_accounts`, `client_sessions` and `audit_logs` tables already support the reset flow.
- Real email/SMS provider connection is still a future task. In local testing without email settings, the reset code is previewed in the Netlify dev terminal.
