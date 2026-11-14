-- Apply after the Ver-0.056 migration. No existing practices are activated.
BEGIN;
CREATE TABLE IF NOT EXISTS public.zipbook_owner_invitations (
  practice_id text PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  staff_id text NOT NULL REFERENCES public.admin_staff_members(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zipbook_owner_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_owner_invitations FROM PUBLIC, anon, authenticated, service_role, zipbook_tenant_runtime;
COMMIT;
