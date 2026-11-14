-- Run on a separate staging Supabase database after the 0.056 migration.
-- Synthetic data only. Transaction rolls back even on successful checks.
BEGIN;
INSERT INTO public.practices(id,name,booking_subdomain,tenant_slug,pilot_enabled)
VALUES ('zz-056-test-alpha','Isolation Test Alpha','zz-056-test-alpha.zipbook.app','zz-056-test-alpha',false),
       ('zz-056-test-beta','Isolation Test Beta','zz-056-test-beta.zipbook.app','zz-056-test-beta',false);
INSERT INTO public.procedures (id,practice_id,name,duration_minutes) VALUES
 ('zz-056-service-alpha','zz-056-test-alpha','Alpha service',30),('zz-056-service-beta','zz-056-test-beta','Beta service',30);
INSERT INTO public.practitioners(id,practice_id,name) VALUES
 ('zz-056-doctor-alpha','zz-056-test-alpha','Alpha doctor'),('zz-056-doctor-beta','zz-056-test-beta','Beta doctor');
INSERT INTO public.practitioner_working_hours(id,practitioner_id,day_of_week,start_time,end_time) VALUES
 ('zz-056-hours-alpha','zz-056-doctor-alpha',1,'09:00','17:00'),('zz-056-hours-beta','zz-056-doctor-beta',1,'09:00','17:00');
INSERT INTO public.customers(id,practice_id,full_name,phone,email) VALUES
 ('zz-056-customer-alpha','zz-056-test-alpha','Synthetic Alpha','+447700900001','alpha@example.invalid'),('zz-056-customer-beta','zz-056-test-beta','Synthetic Beta','+447700900002','beta@example.invalid');
INSERT INTO public.admin_staff_members(id,practice_id,full_name,email,role,active,password_hash) VALUES
 ('zz-056-staff-alpha','zz-056-test-alpha','Synthetic Alpha','owner@example.invalid','Owner',true,'not-a-real-password-hash'),('zz-056-staff-beta','zz-056-test-beta','Synthetic Beta','owner@example.invalid','Owner',true,'not-a-real-password-hash');
INSERT INTO public.admin_staff_sessions(id,practice_id,staff_id,session_token_hash,expires_at) VALUES
 ('zz-056-session-alpha','zz-056-test-alpha','zz-056-staff-alpha','zz-056-token-alpha',now()+interval '1 hour'),('zz-056-session-beta','zz-056-test-beta','zz-056-staff-beta','zz-056-token-beta',now()+interval '1 hour');
INSERT INTO public.bookings(id,practice_id,patient_name,patient_phone,patient_email,customer_id,procedure_id,practitioner_id,booking_date,start_time,end_time) VALUES
 ('zz-056-booking-alpha','zz-056-test-alpha','Synthetic Alpha','+447700900001','alpha@example.invalid','zz-056-customer-alpha','zz-056-service-alpha','zz-056-doctor-alpha',current_date+10,'09:00','09:30'),
 ('zz-056-booking-beta','zz-056-test-beta','Synthetic Beta','+447700900002','beta@example.invalid','zz-056-customer-beta','zz-056-service-beta','zz-056-doctor-beta',current_date+10,'09:00','09:30');
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.zipbook_resolve_business(NULL,'zz-056-test-alpha')) THEN RAISE EXCEPTION 'Disabled business resolved'; END IF;
END $$;
SET LOCAL ROLE zipbook_tenant_runtime;
SELECT set_config('zipbook.practice_id','zz-056-test-alpha',true);
DO $$
DECLARE rows_changed integer;
BEGIN
 IF (SELECT count(*) FROM public.practices) <> 1 OR NOT EXISTS(SELECT 1 FROM public.practices WHERE id='zz-056-test-alpha') THEN RAISE EXCEPTION 'Alpha practice visibility failed'; END IF;
 IF (SELECT count(*) FROM public.customers) <> 1 OR (SELECT count(*) FROM public.bookings) <> 1 OR (SELECT count(*) FROM public.admin_staff_members) <> 1 OR (SELECT count(*) FROM public.admin_staff_sessions) <> 1 OR (SELECT count(*) FROM public.practitioner_working_hours) <> 1 THEN RAISE EXCEPTION 'Cross-business read leak'; END IF;
 IF EXISTS(SELECT 1 FROM public.admin_staff_sessions WHERE session_token_hash='zz-056-token-beta') THEN RAISE EXCEPTION 'Cross-business session leak'; END IF;
 UPDATE public.bookings SET notes='not allowed' WHERE id='zz-056-booking-beta'; GET DIAGNOSTICS rows_changed=ROW_COUNT;
 IF rows_changed<>0 THEN RAISE EXCEPTION 'Cross-business update was allowed'; END IF;
 DELETE FROM public.customers WHERE id='zz-056-customer-beta'; GET DIAGNOSTICS rows_changed=ROW_COUNT;
 IF rows_changed<>0 THEN RAISE EXCEPTION 'Cross-business delete was allowed'; END IF;
 BEGIN
  INSERT INTO public.practitioner_procedures(practitioner_id,procedure_id) VALUES ('zz-056-doctor-alpha','zz-056-service-beta');
  RAISE EXCEPTION 'Cross-business relationship was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.bookings SET customer_id='zz-056-customer-beta' WHERE id='zz-056-booking-alpha';
  RAISE EXCEPTION 'Cross-business booking relationship was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.practices SET pilot_enabled=true WHERE id='zz-056-test-alpha';
  RAISE EXCEPTION 'Runtime could activate a business';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('zipbook.practice_id','zz-056-test-beta',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.practices)<>1 OR NOT EXISTS(SELECT 1 FROM public.bookings WHERE id='zz-056-booking-beta') OR EXISTS(SELECT 1 FROM public.bookings WHERE id='zz-056-booking-alpha') THEN RAISE EXCEPTION 'Beta isolation failed'; END IF;
END $$;
SELECT set_config('zipbook.practice_id','',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.bookings) OR EXISTS(SELECT 1 FROM public.customers) OR EXISTS(SELECT 1 FROM public.practices) THEN RAISE EXCEPTION 'Missing tenant context did not fail closed'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: synthetic two-business database isolation' AS result;
ROLLBACK;
