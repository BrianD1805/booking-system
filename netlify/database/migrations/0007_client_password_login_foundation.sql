-- Ver-0.017: normal client sign-in/sign-up foundation.
-- OTP is kept for first-time phone verification only. Returning clients sign in with mobile number + password.

ALTER TABLE client_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE client_accounts ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

UPDATE client_accounts
SET phone_verified_at = verified_at
WHERE phone_verified_at IS NULL AND verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS client_accounts_verified_phone_idx ON client_accounts(practice_id, login_phone, verified_at);
