-- Ver-0.016: email OTP delivery foundation and phone-first client account identity.
-- Client login accounts are uniquely identified by the full international mobile number.
-- Email is used as the first live OTP delivery channel before SMS is connected, but email is not a unique account identifier.

DROP INDEX IF EXISTS client_accounts_practice_email_unique_idx;
CREATE INDEX IF NOT EXISTS client_accounts_practice_email_idx ON client_accounts(practice_id, lower(login_email));

CREATE UNIQUE INDEX IF NOT EXISTS client_accounts_practice_phone_unique_idx ON client_accounts(practice_id, login_phone);
