-- ZipBook Ver-0.052 — run once in the Supabase SQL Editor.
-- Single-row Supabase heartbeat for the Netlify Scheduled Function.
-- No booking/customer data is stored here.

CREATE TABLE IF NOT EXISTS public.zipbook_system_heartbeat (
  id TEXT PRIMARY KEY CHECK (id = 'zipbook-primary'),
  last_ping_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_count BIGINT NOT NULL DEFAULT 0 CHECK (run_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- This maintenance table should not be accessible to client-side Supabase roles.
ALTER TABLE public.zipbook_system_heartbeat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.zipbook_system_heartbeat FROM PUBLIC, anon, authenticated;

-- After the first scheduled run, use the following query in Supabase SQL Editor:
-- SELECT id, last_ping_at, run_count, created_at
-- FROM public.zipbook_system_heartbeat;
