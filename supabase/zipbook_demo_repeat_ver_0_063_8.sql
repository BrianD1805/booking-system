-- ZipBook Ver-0.063.8: 30-minute full demo and email-verified repeat visits.
-- Run after the Ver-0.063.5 demo attempts migration. Does not remove bookings.
BEGIN;
CREATE TABLE IF NOT EXISTS public.zipbook_public_demo_visitors (
  fingerprint text PRIMARY KEY CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  first_started_at timestamptz,
  last_started_at timestamptz,
  sessions_granted integer NOT NULL DEFAULT 0 CHECK (sessions_granted BETWEEN 0 AND 100000),
  daily_window_start timestamptz NOT NULL DEFAULT now(),
  sessions_today integer NOT NULL DEFAULT 0 CHECK (sessions_today BETWEEN 0 AND 100),
  challenge_passed_until timestamptz,
  pending_first_name text,
  pending_surname text,
  pending_phone text,
  pending_email text,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer NOT NULL DEFAULT 0 CHECK (otp_attempts BETWEEN 0 AND 10),
  otp_sent_at timestamptz,
  otp_window_start timestamptz NOT NULL DEFAULT now(),
  otp_requests integer NOT NULL DEFAULT 0 CHECK (otp_requests BETWEEN 0 AND 100),
  last_verified_at timestamptz,
  consented_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zipbook_public_demo_visitors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_public_demo_visitors FROM PUBLIC, anon, authenticated, zipbook_tenant_runtime;
CREATE INDEX IF NOT EXISTS zipbook_public_demo_visitors_last_started ON public.zipbook_public_demo_visitors(last_started_at);
COMMIT;
