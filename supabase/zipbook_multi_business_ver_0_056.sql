-- Run as the database owner (normally postgres), after migrations up to 0.054.
BEGIN;
ALTER TABLE public.practices ADD COLUMN IF NOT EXISTS pilot_enabled boolean NOT NULL DEFAULT false;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='zipbook_tenant_runtime') THEN
    CREATE ROLE zipbook_tenant_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='zipbook_tenant_runtime' AND (rolsuper OR rolbypassrls OR rolcanlogin OR rolcreaterole OR rolcreatedb OR rolinherit)) THEN
    RAISE EXCEPTION 'Unsafe ZipBook runtime role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON m.member=r.oid WHERE r.rolname='zipbook_tenant_runtime') THEN
    RAISE EXCEPTION 'ZipBook runtime role must not inherit other roles';
  END IF;
END $$;
GRANT zipbook_tenant_runtime TO postgres;
GRANT USAGE ON SCHEMA public TO zipbook_tenant_runtime;
-- Verify every expected table exists; a missing earlier migration aborts everything.
CREATE TABLE IF NOT EXISTS public.zipbook_staff_login_limits (
  practice_id text NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  staff_id text NOT NULL REFERENCES public.admin_staff_members(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0,
  PRIMARY KEY (practice_id,staff_id)
);
DO $$
DECLARE t text; cond text; write_cond text;
BEGIN
  FOREACH t IN ARRAY ARRAY['practices','tenant_domains','procedures','practitioners','bookings','blocked_dates','blocked_times','notification_settings','notification_logs','late_messages','embed_settings','audit_logs','customers','client_accounts','client_sessions','client_login_otps','client_push_subscriptions','admin_staff_members','admin_staff_sessions','admin_push_subscriptions','customer_family_members','customer_documents','practitioner_working_hours','practitioner_procedures','practitioner_blocked_times','zipbook_staff_login_limits'] LOOP
    IF to_regclass('public.'||t) IS NULL THEN RAISE EXCEPTION 'Missing table %', t; END IF;
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid JOIN pg_roles r ON c.relowner=r.oid WHERE n.nspname='public' AND c.relname=t AND r.rolname='zipbook_tenant_runtime') THEN RAISE EXCEPTION 'Runtime role owns %',t; END IF;
    IF t='practices' THEN cond := 'id = nullif(current_setting(''zipbook.practice_id'',true),'''')';
    ELSIF t IN ('practitioner_working_hours','practitioner_blocked_times','practitioner_procedures') THEN
      cond := format('EXISTS (SELECT 1 FROM public.practitioners p WHERE p.id=%I.practitioner_id AND p.practice_id=nullif(current_setting(''zipbook.practice_id'',true),''''))',t);
      IF t='practitioner_procedures' THEN cond := cond || ' AND EXISTS (SELECT 1 FROM public.procedures s WHERE s.id=practitioner_procedures.procedure_id AND s.practice_id=nullif(current_setting(''zipbook.practice_id'',true),''''))'; END IF;
    ELSE cond := 'practice_id = nullif(current_setting(''zipbook.practice_id'',true),'''')'; END IF;
    write_cond := cond;
    -- Validate cross-table references independently of the API (including foreign IDs supplied by browsers).
    IF t='bookings' THEN
      write_cond := write_cond || ' AND EXISTS (SELECT 1 FROM public.procedures s WHERE s.id=bookings.procedure_id AND s.practice_id=bookings.practice_id) AND (bookings.practitioner_id IS NULL OR EXISTS (SELECT 1 FROM public.practitioners p WHERE p.id=bookings.practitioner_id AND p.practice_id=bookings.practice_id)) AND (bookings.customer_id IS NULL OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id=bookings.customer_id AND c.practice_id=bookings.practice_id))';
    ELSIF t IN ('client_accounts','client_sessions','client_login_otps','client_push_subscriptions','customer_family_members','customer_documents') THEN
      write_cond := write_cond || format(' AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id=%I.customer_id AND c.practice_id=%I.practice_id)',t,t);
    ELSIF t IN ('admin_staff_sessions','zipbook_staff_login_limits') THEN
      write_cond := write_cond || format(' AND EXISTS (SELECT 1 FROM public.admin_staff_members s WHERE s.id=%I.staff_id AND s.practice_id=%I.practice_id)',t,t);
    ELSIF t='admin_push_subscriptions' THEN
      write_cond := write_cond || ' AND (admin_push_subscriptions.staff_id IS NULL OR EXISTS (SELECT 1 FROM public.admin_staff_members s WHERE s.id=admin_push_subscriptions.staff_id AND s.practice_id=admin_push_subscriptions.practice_id))';
    ELSIF t='notification_logs' THEN
      write_cond := write_cond || ' AND (notification_logs.booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id=notification_logs.booking_id AND b.practice_id=notification_logs.practice_id))';
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, zipbook_tenant_runtime',t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO zipbook_tenant_runtime',t);
    EXECUTE format('DROP POLICY IF EXISTS zipbook_scope_allow ON public.%I',t);
    EXECUTE format('DROP POLICY IF EXISTS zipbook_scope_guard ON public.%I',t);
    EXECUTE format('CREATE POLICY zipbook_scope_allow ON public.%I AS PERMISSIVE FOR ALL TO zipbook_tenant_runtime USING (true) WITH CHECK (true)',t);
    EXECUTE format('CREATE POLICY zipbook_scope_guard ON public.%I AS RESTRICTIVE FOR ALL TO zipbook_tenant_runtime USING (%s) WITH CHECK (%s)',t,cond,write_cond);
  END LOOP;
END $$;
-- Runtime cannot create/delete businesses or alter platform identity/status/host fields.
REVOKE INSERT, UPDATE, DELETE ON public.practices FROM zipbook_tenant_runtime;
GRANT UPDATE (name, public_display_name, practice_address, practice_phone, practice_email, logo_url, timezone, currency_code, country_code, working_days, working_start_time, working_end_time, lunch_break_enabled, lunch_break_start, lunch_break_end, slot_interval_minutes, minimum_notice_hours, max_booking_ahead_days, allow_same_day_bookings, cancellation_policy_note, updated_at) ON public.practices TO zipbook_tenant_runtime;
REVOKE INSERT, UPDATE, DELETE ON public.tenant_domains FROM zipbook_tenant_runtime;
-- Lookup uses only a canonical server-selected default ID or an explicitly enabled pilot slug.
CREATE OR REPLACE FUNCTION public.zipbook_resolve_business(default_id text, requested_slug text)
RETURNS TABLE(practice_id text, tenant_slug text, practice_name text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
  SELECT p.id, coalesce(p.tenant_slug,''), coalesce(nullif(p.public_display_name,''),p.name)
  FROM public.practices p WHERE p.tenant_status='active'
    AND ((default_id IS NOT NULL AND requested_slug IS NULL AND p.id=default_id AND p.plan_code IS DISTINCT FROM 'pilot')
      OR (default_id IS NULL AND requested_slug IS NOT NULL AND p.tenant_slug=requested_slug AND p.pilot_enabled=true))
$$;
REVOKE ALL ON FUNCTION public.zipbook_resolve_business(text,text) FROM PUBLIC, anon, authenticated, service_role, zipbook_tenant_runtime;
GRANT EXECUTE ON FUNCTION public.zipbook_resolve_business(text,text) TO postgres;
COMMIT;
