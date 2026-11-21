-- ZipBook Ver-0.060: secure, per-business PNG logo storage for bookings and PWA.
-- Run after Ver-0.056 and Ver-0.058 migrations in Supabase SQL Editor.
-- Does NOT alter existing bookings, practice logos or staff sessions.
BEGIN;
CREATE TABLE IF NOT EXISTS public.zipbook_business_branding (
  practice_id text PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
  logo_data bytea NOT NULL,
  logo_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT branding_060_size CHECK (octet_length(logo_data) BETWEEN 1 AND 2000000),
  CONSTRAINT branding_060_revision CHECK (logo_version ~ '^[0-9a-f-]{36}$')
);
ALTER TABLE public.zipbook_business_branding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_business_branding FROM PUBLIC, anon, authenticated, service_role, zipbook_tenant_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zipbook_business_branding TO zipbook_tenant_runtime;
DROP POLICY IF EXISTS zipbook_branding_scope_allow_060 ON public.zipbook_business_branding;
DROP POLICY IF EXISTS zipbook_branding_scope_guard_060 ON public.zipbook_business_branding;
CREATE POLICY zipbook_branding_scope_allow_060 ON public.zipbook_business_branding
  AS PERMISSIVE FOR ALL TO zipbook_tenant_runtime USING (true) WITH CHECK (true);
CREATE POLICY zipbook_branding_scope_guard_060 ON public.zipbook_business_branding
  AS RESTRICTIVE FOR ALL TO zipbook_tenant_runtime
  USING (practice_id = nullif(current_setting('zipbook.practice_id',true),''))
  WITH CHECK (practice_id = nullif(current_setting('zipbook.practice_id',true),''));
COMMIT;
