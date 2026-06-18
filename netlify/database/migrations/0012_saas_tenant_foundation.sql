-- Ver-0.030 SaaS Tenant Foundation
-- Adds tenant/practice metadata and domain routing records without changing the current single-practice demo behaviour.

ALTER TABLE practices ADD COLUMN IF NOT EXISTS tenant_slug TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS public_booking_path TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS client_app_url TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS admin_app_url TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS admin_subdomain TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS primary_domain TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS tenant_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'foundation';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS plan_code TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en-GB';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'KES';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'KE';
ALTER TABLE practices ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS launched_at TIMESTAMPTZ;

UPDATE practices
SET
  tenant_slug = COALESCE(tenant_slug, 'zippy-dental-demo'),
  public_booking_path = COALESCE(public_booking_path, '/book'),
  client_app_url = COALESCE(client_app_url, 'https://zipbook.app/book'),
  admin_app_url = COALESCE(admin_app_url, 'https://admin.zipbook.app'),
  admin_subdomain = COALESCE(admin_subdomain, 'admin.zipbook.app'),
  primary_domain = COALESCE(primary_domain, 'zipbook.app'),
  owner_name = COALESCE(owner_name, 'ZippyWeb Demo'),
  owner_email = COALESCE(owner_email, 'info@zippyweb.uk'),
  tenant_status = COALESCE(NULLIF(tenant_status, ''), 'active'),
  subscription_status = COALESCE(NULLIF(subscription_status, ''), 'foundation'),
  plan_code = COALESCE(NULLIF(plan_code, ''), 'demo'),
  timezone = COALESCE(NULLIF(timezone, ''), 'Africa/Nairobi'),
  locale = COALESCE(NULLIF(locale, ''), 'en-GB'),
  currency_code = COALESCE(NULLIF(currency_code, ''), 'KES'),
  country_code = COALESCE(NULLIF(country_code, ''), 'KE'),
  onboarding_completed = COALESCE(onboarding_completed, TRUE),
  launched_at = COALESCE(launched_at, NOW()),
  updated_at = NOW()
WHERE id = 'practice_001';

CREATE UNIQUE INDEX IF NOT EXISTS practices_tenant_slug_unique_idx ON practices(tenant_slug) WHERE tenant_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS practices_status_idx ON practices(tenant_status, subscription_status);

CREATE TABLE IF NOT EXISTS tenant_domains (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  path_prefix TEXT NOT NULL DEFAULT '/',
  surface TEXT NOT NULL DEFAULT 'client' CHECK (surface IN ('landing', 'client', 'admin', 'widget')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_custom_domain BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'system' CHECK (verification_status IN ('system', 'pending', 'verified', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(host, path_prefix, surface)
);

CREATE INDEX IF NOT EXISTS tenant_domains_practice_idx ON tenant_domains(practice_id, surface);
CREATE INDEX IF NOT EXISTS tenant_domains_lookup_idx ON tenant_domains(host, path_prefix, surface);

INSERT INTO tenant_domains (id, practice_id, host, path_prefix, surface, is_primary, is_custom_domain, verification_status, notes)
VALUES
  ('td-practice-001-landing', 'practice_001', 'zipbook.app', '/', 'landing', TRUE, FALSE, 'system', 'Public ZipBook landing page.'),
  ('td-practice-001-client', 'practice_001', 'zipbook.app', '/book', 'client', TRUE, FALSE, 'system', 'Client booking PWA for the default demo practice.'),
  ('td-practice-001-admin', 'practice_001', 'admin.zipbook.app', '/', 'admin', TRUE, FALSE, 'system', 'Admin app for the default demo practice.'),
  ('td-practice-001-widget', 'practice_001', 'zipbook.app', '/widget', 'widget', TRUE, FALSE, 'system', 'Embeddable widget route for the default demo practice.')
ON CONFLICT (host, path_prefix, surface) DO UPDATE SET
  practice_id = EXCLUDED.practice_id,
  is_primary = EXCLUDED.is_primary,
  is_custom_domain = EXCLUDED.is_custom_domain,
  verification_status = EXCLUDED.verification_status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
VALUES (
  'audit-saas-foundation-0012',
  'practice_001',
  'saas_tenant_foundation_applied',
  'practice',
  'practice_001',
  'migration',
  '{"version":"0.030","note":"Tenant/practice metadata and domain mapping foundation added."}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
