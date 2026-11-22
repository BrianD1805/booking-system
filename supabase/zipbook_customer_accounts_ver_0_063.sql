-- ZipBook Ver-0.063: login throttling for customer accounts.
-- Requires Ver-0.056 multi-business RLS and Ver-0.062 public-booking safeguards.
-- Does not enable public bookings, alter customers or copy guest bookings.
BEGIN;

CREATE TABLE IF NOT EXISTS public.zipbook_client_auth_limits (
  practice_id text NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT NOW(),
  attempts integer NOT NULL DEFAULT 0,
  PRIMARY KEY (practice_id, fingerprint),
  CONSTRAINT zipbook_client_auth_fingerprint_063 CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT zipbook_client_auth_attempts_063 CHECK (attempts BETWEEN 0 AND 100)
);

ALTER TABLE public.zipbook_client_auth_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_client_auth_limits FROM PUBLIC, anon, authenticated, service_role, zipbook_tenant_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zipbook_client_auth_limits TO zipbook_tenant_runtime;
DROP POLICY IF EXISTS zipbook_client_auth_allow_063 ON public.zipbook_client_auth_limits;
DROP POLICY IF EXISTS zipbook_client_auth_guard_063 ON public.zipbook_client_auth_limits;
CREATE POLICY zipbook_client_auth_allow_063 ON public.zipbook_client_auth_limits
  AS PERMISSIVE FOR ALL TO zipbook_tenant_runtime USING (true) WITH CHECK (true);
CREATE POLICY zipbook_client_auth_guard_063 ON public.zipbook_client_auth_limits
  AS RESTRICTIVE FOR ALL TO zipbook_tenant_runtime
  USING (practice_id = nullif(current_setting('zipbook.practice_id',true),''))
  WITH CHECK (practice_id = nullif(current_setting('zipbook.practice_id',true),''));

-- Expired windows may be removed periodically in a future scheduled housekeeping task.
COMMIT;
