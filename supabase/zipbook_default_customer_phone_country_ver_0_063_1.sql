-- ZipBook Ver-0.063.1: independent default phone country per business.
-- Apply once in Supabase SQL Editor BEFORE deploying the new programme.
BEGIN;
ALTER TABLE public.practices
  ADD COLUMN IF NOT EXISTS client_phone_country_code text;

UPDATE public.practices
SET client_phone_country_code = COALESCE(NULLIF(upper(country_code), ''), 'GB')
WHERE client_phone_country_code IS NULL;

-- Tenant business owners have column-level UPDATE permissions (Ver-0.056).
-- Grant access to this NEW profile field without exposing other protected columns.
GRANT UPDATE (client_phone_country_code) ON public.practices TO zipbook_tenant_runtime;

ALTER TABLE public.practices
  DROP CONSTRAINT IF EXISTS zipbook_client_phone_country_code_063_1;
ALTER TABLE public.practices
  ADD CONSTRAINT zipbook_client_phone_country_code_063_1
  CHECK (client_phone_country_code IS NULL OR client_phone_country_code ~ '^[A-Z]{2}$');
COMMIT;

SELECT id, name, country_code AS business_country,
       COALESCE(client_phone_country_code, country_code, 'GB') AS default_phone_country
FROM public.practices
ORDER BY name;
