-- ZipBook Ver-0.050 — Admin phone push subscriptions
-- Run once in Supabase SQL Editor before testing admin phone alerts.

CREATE TABLE IF NOT EXISTS public.admin_push_subscriptions (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  staff_id TEXT,
  staff_name TEXT,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_push_subscriptions_practice_endpoint_idx
  ON public.admin_push_subscriptions(practice_id, endpoint);

CREATE INDEX IF NOT EXISTS admin_push_subscriptions_staff_enabled_idx
  ON public.admin_push_subscriptions(practice_id, staff_id, enabled, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_push_subscriptions TO service_role;

INSERT INTO public.audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
VALUES (
  'audit-admin-push-notifications-ver-0-050',
  'practice_001',
  'admin_push_notifications_schema_applied',
  'practice',
  'practice_001',
  'migration',
  '{"version":"0.050","note":"Admin phone push notification subscriptions table added."}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
