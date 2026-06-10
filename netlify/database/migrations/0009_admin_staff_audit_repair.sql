-- Ver-0.024B: safe repair migration for admin staff login and audit trail.
-- This does not edit migration 0008. It safely ensures the required tables,
-- columns and indexes exist if a local/live database marked 0008 as applied
-- without creating every object.

CREATE TABLE IF NOT EXISTS public.admin_staff_members (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Reception',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_staff_members_practice_email_unique_idx
  ON public.admin_staff_members(practice_id, lower(email));
CREATE INDEX IF NOT EXISTS admin_staff_members_practice_active_idx
  ON public.admin_staff_members(practice_id, active, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_staff_sessions (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id),
  staff_id TEXT NOT NULL REFERENCES public.admin_staff_members(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_staff_sessions_staff_idx
  ON public.admin_staff_sessions(practice_id, staff_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS admin_staff_sessions_expiry_idx
  ON public.admin_staff_sessions(expires_at);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  source TEXT NOT NULL DEFAULT 'system',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS staff_name TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_ip TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS audit_logs_practice_created_idx
  ON public.audit_logs(practice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_staff_created_idx
  ON public.audit_logs(practice_id, staff_id, created_at DESC);
