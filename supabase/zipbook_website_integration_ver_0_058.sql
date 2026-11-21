-- ZipBook Ver-0.058: website integration allow-list. Run in Supabase SQL Editor
-- AFTER applying Ver-0.056 and Ver-0.057 migrations. No existing rows modified.
BEGIN;

CREATE TABLE IF NOT EXISTS public.zipbook_embed_domains (
  id text PRIMARY KEY,
  practice_id text NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  origin text NOT NULL,
  public_embed_enabled boolean NOT NULL DEFAULT false,
  admin_embed_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zipbook_embed_domain_unique_058 UNIQUE (practice_id, origin),
  CONSTRAINT zipbook_embed_origin_https_058 CHECK (origin ~ '^https://[a-z0-9.-]+$'),
  CONSTRAINT zipbook_embed_origin_no_native_058 CHECK (origin <> 'https://zipbook.app' AND origin !~ '\.zipbook\.app$')
);

ALTER TABLE public.zipbook_embed_domains ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_embed_domains FROM PUBLIC, anon, authenticated, service_role, zipbook_tenant_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zipbook_embed_domains TO zipbook_tenant_runtime;
DROP POLICY IF EXISTS zipbook_embed_scope_allow_058 ON public.zipbook_embed_domains;
DROP POLICY IF EXISTS zipbook_embed_scope_guard_058 ON public.zipbook_embed_domains;
CREATE POLICY zipbook_embed_scope_allow_058 ON public.zipbook_embed_domains AS PERMISSIVE
  FOR ALL TO zipbook_tenant_runtime USING (true) WITH CHECK (true);
CREATE POLICY zipbook_embed_scope_guard_058 ON public.zipbook_embed_domains AS RESTRICTIVE
  FOR ALL TO zipbook_tenant_runtime
  USING (practice_id = nullif(current_setting('zipbook.practice_id',true),''))
  WITH CHECK (practice_id = nullif(current_setting('zipbook.practice_id',true),''));

CREATE INDEX IF NOT EXISTS zipbook_embed_domains_practice_058_idx ON public.zipbook_embed_domains(practice_id);
COMMIT;
