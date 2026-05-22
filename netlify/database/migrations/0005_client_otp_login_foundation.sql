-- Ver-0.014: client OTP login foundation.
-- This adds one-time login code and lightweight client session tables.
-- Real SMS/email delivery is intentionally not connected yet; the development code is returned by the API for local testing only.

CREATE TABLE IF NOT EXISTS client_login_otps (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  otp_code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_login_otps_customer_idx ON client_login_otps(practice_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS client_login_otps_expiry_idx ON client_login_otps(expires_at);

CREATE TABLE IF NOT EXISTS client_sessions (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_sessions_customer_idx ON client_sessions(practice_id, customer_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS client_sessions_expiry_idx ON client_sessions(expires_at);
