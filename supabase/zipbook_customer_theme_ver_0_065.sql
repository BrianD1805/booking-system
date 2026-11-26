BEGIN;
CREATE TABLE IF NOT EXISTS public.zipbook_customer_themes (
 practice_id text PRIMARY KEY REFERENCES public.practices(id) ON DELETE CASCADE,
 theme jsonb CHECK (theme IS NULL OR (jsonb_typeof(theme)='object' AND octet_length(theme::text)<=4096)),
 updated_at timestamptz NOT NULL DEFAULT now(),
 last_scan_at timestamptz
);
ALTER TABLE public.zipbook_customer_themes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zipbook_customer_themes FROM PUBLIC, anon, authenticated, service_role, zipbook_tenant_runtime;
GRANT SELECT, INSERT, UPDATE ON public.zipbook_customer_themes TO zipbook_tenant_runtime;
DROP POLICY IF EXISTS customer_theme_allow ON public.zipbook_customer_themes;
DROP POLICY IF EXISTS customer_theme_scope ON public.zipbook_customer_themes;
CREATE POLICY customer_theme_allow ON public.zipbook_customer_themes AS PERMISSIVE FOR ALL TO zipbook_tenant_runtime USING (true) WITH CHECK (true);
CREATE POLICY customer_theme_scope ON public.zipbook_customer_themes AS RESTRICTIVE FOR ALL TO zipbook_tenant_runtime
 USING (practice_id = nullif(current_setting('zipbook.practice_id',true),''))
 WITH CHECK (practice_id = nullif(current_setting('zipbook.practice_id',true),''));
COMMIT;
