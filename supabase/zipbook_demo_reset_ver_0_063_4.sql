-- ZipBook Ver-0.063.4: platform-admin-only saved demo reset profiles.
-- No customer or booking data is deleted by this migration.
BEGIN;
CREATE TABLE IF NOT EXISTS public.zipbook_demo_reset_profiles (
  practice_id text PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  default_settings jsonb NOT NULL CHECK (jsonb_typeof(default_settings) = 'object'),
  saved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zipbook_demo_reset_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_demo_reset_profiles FROM PUBLIC, anon, authenticated, zipbook_tenant_runtime;
-- Platform operations use the private database-owner connection, never the tenant runtime role.
COMMIT;
SELECT practice_id, saved_at FROM public.zipbook_demo_reset_profiles ORDER BY saved_at DESC;
