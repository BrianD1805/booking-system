BEGIN;
ALTER TABLE public.practices ADD COLUMN IF NOT EXISTS platform_suspended boolean;
UPDATE public.practices p SET platform_suspended = EXISTS (SELECT 1 FROM public.audit_logs a WHERE a.practice_id=p.id AND a.action='platform_business_suspend') AND NOT p.pilot_enabled WHERE p.plan_code='pilot' AND p.platform_suspended IS NULL;
ALTER TABLE public.practices ALTER COLUMN platform_suspended SET DEFAULT false;
CREATE TABLE IF NOT EXISTS public.zipbook_onboarding_emails (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), practice_id text NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('invitation','diary','live')), provider_id text, status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(), checked_at timestamptz
);
CREATE INDEX IF NOT EXISTS zipbook_onboarding_emails_recent ON public.zipbook_onboarding_emails(practice_id,kind,created_at DESC);
ALTER TABLE public.zipbook_onboarding_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_onboarding_emails FROM PUBLIC, anon, authenticated, service_role, zipbook_tenant_runtime;
CREATE TABLE IF NOT EXISTS public.zipbook_staff_reset_tokens (
 practice_id text NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
 staff_id text NOT NULL REFERENCES public.admin_staff_members(id) ON DELETE CASCADE,
 token_hash text PRIMARY KEY, email text NOT NULL, credential_fingerprint text NOT NULL,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(practice_id,staff_id)
);
CREATE TABLE IF NOT EXISTS public.zipbook_staff_reset_limits (
 practice_id text NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
 bucket text NOT NULL, window_start timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 1,
 PRIMARY KEY(practice_id,bucket)
);
ALTER TABLE public.zipbook_staff_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zipbook_staff_reset_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_staff_reset_tokens, public.zipbook_staff_reset_limits FROM PUBLIC, anon, authenticated, service_role, zipbook_tenant_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.zipbook_staff_reset_tokens, public.zipbook_staff_reset_limits TO zipbook_tenant_runtime;
DROP POLICY IF EXISTS staff_reset_tenant ON public.zipbook_staff_reset_tokens;
DROP POLICY IF EXISTS staff_reset_allow ON public.zipbook_staff_reset_tokens;
CREATE POLICY staff_reset_allow ON public.zipbook_staff_reset_tokens TO zipbook_tenant_runtime USING (true) WITH CHECK (true);
CREATE POLICY staff_reset_tenant ON public.zipbook_staff_reset_tokens AS RESTRICTIVE TO zipbook_tenant_runtime USING (practice_id=current_setting('zipbook.practice_id',true)) WITH CHECK (practice_id=current_setting('zipbook.practice_id',true) AND EXISTS (SELECT 1 FROM public.admin_staff_members s WHERE s.id=zipbook_staff_reset_tokens.staff_id AND s.practice_id=zipbook_staff_reset_tokens.practice_id));
DROP POLICY IF EXISTS staff_reset_tenant ON public.zipbook_staff_reset_limits;
DROP POLICY IF EXISTS staff_reset_allow ON public.zipbook_staff_reset_limits;
CREATE POLICY staff_reset_allow ON public.zipbook_staff_reset_limits TO zipbook_tenant_runtime USING (true) WITH CHECK (true);
CREATE POLICY staff_reset_tenant ON public.zipbook_staff_reset_limits AS RESTRICTIVE TO zipbook_tenant_runtime USING (practice_id=current_setting('zipbook.practice_id',true)) WITH CHECK (practice_id=current_setting('zipbook.practice_id',true));
COMMIT;
