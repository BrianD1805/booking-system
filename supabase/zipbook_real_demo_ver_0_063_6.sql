-- ZipBook Ver-0.063.6 — full connected demo
-- Safe, idempotent prerequisite if the Ver-0.063.5 demo-attempts migration
-- was not already applied. Existing tenants, staff and appointments unchanged.
BEGIN;
CREATE TABLE IF NOT EXISTS public.zipbook_public_demo_attempts (
  fingerprint text PRIMARY KEY CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 100)
);
ALTER TABLE public.zipbook_public_demo_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_public_demo_attempts
  FROM PUBLIC, anon, authenticated, zipbook_tenant_runtime;
COMMIT;
