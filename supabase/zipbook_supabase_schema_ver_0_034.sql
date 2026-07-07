-- ZipBook Ver-0.034 - Supabase Schema Setup Pack
-- Full clean Supabase/Postgres schema for a fresh ZipBook database.
-- Generated from current Netlify Database migrations 0001 through 0013.
--
-- HOW TO USE:
-- 1) Create a fresh Supabase project.
-- 2) Open Supabase Dashboard > SQL Editor > New query.
-- 3) Paste this entire file and run it once.
-- 4) Confirm the verification query at the bottom returns the expected core tables.
--
-- IMPORTANT:
-- - This file is for a NEW Supabase database.
-- - Do not run it repeatedly against a live production database unless you understand the seed/upsert behaviour.
-- - It does not cut the app over to Supabase. That comes in a later build.
-- - RLS is intentionally not enabled yet because ZipBook currently uses server-side API routes.

SET search_path = public;



-- ============================================================
-- Source migration: 0001_booking_system_foundation.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS practices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  booking_subdomain TEXT NOT NULL,
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  working_start_time TIME NOT NULL DEFAULT '08:30',
  working_end_time TIME NOT NULL DEFAULT '17:00',
  slot_interval_minutes INTEGER NOT NULL DEFAULT 15,
  minimum_notice_hours INTEGER NOT NULL DEFAULT 2,
  max_booking_ahead_days INTEGER NOT NULL DEFAULT 90,
  fallback_sms BOOLEAN NOT NULL DEFAULT TRUE,
  mobile_push BOOLEAN NOT NULL DEFAULT TRUE,
  medical_data_mode TEXT NOT NULL DEFAULT 'Dedicated Netlify Database first, later expandable to shared SaaS with strict tenant separation.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_guide TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  procedure_id TEXT NOT NULL REFERENCES procedures(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show')),
  source TEXT NOT NULL DEFAULT 'client' CHECK (source IN ('client', 'admin', 'staff')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_practice_date_idx ON bookings(practice_id, booking_date, start_time);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

CREATE TABLE IF NOT EXISTS blocked_dates (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  blocked_date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(practice_id, blocked_date)
);

CREATE TABLE IF NOT EXISTS blocked_times (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blocked_times_practice_date_idx ON blocked_times(practice_id, blocked_date, start_time);

CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  reminder_one_day BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_one_hour BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_fallback_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  booking_id TEXT REFERENCES bookings(id),
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS late_messages (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  booking_date DATE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS embed_settings (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  allowed_domain TEXT,
  embed_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  source TEXT NOT NULL DEFAULT 'system',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO practices (
  id, name, booking_subdomain, working_days, working_start_time, working_end_time,
  slot_interval_minutes, minimum_notice_hours, max_booking_ahead_days, fallback_sms, mobile_push, medical_data_mode
) VALUES (
  'practice_001', 'Zippy Dental Demo', 'demo.bookings.zippyweb.uk', ARRAY[1,2,3,4,5], '08:30', '17:00',
  15, 2, 90, TRUE, TRUE, 'Dedicated Netlify Database first, later expandable to a shared SaaS database with strict tenant separation.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO procedures (id, practice_id, name, duration_minutes, price_guide, active, display_order) VALUES
  ('checkup', 'practice_001', 'Dental check-up', 30, 'Standard consultation', TRUE, 10),
  ('cleaning', 'practice_001', 'Scale and polish', 45, 'Hygienist appointment', TRUE, 20),
  ('filling', 'practice_001', 'Filling appointment', 60, 'Time varies by case', TRUE, 30),
  ('root-canal', 'practice_001', 'Root canal consultation', 75, 'Assessment required', TRUE, 40),
  ('emergency', 'practice_001', 'Emergency dental appointment', 30, 'Priority slot', TRUE, 50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (
  id, practice_id, patient_name, patient_phone, patient_email, procedure_id,
  booking_date, start_time, end_time, status, source, notes
) VALUES
  ('bk-1001', 'practice_001', 'Amina Patel', '+254 700 000001', 'amina@example.com', 'checkup', '2026-05-18', '09:30', '10:00', 'confirmed', 'admin', 'Prefers morning appointments.'),
  ('bk-1002', 'practice_001', 'David Mwangi', '+254 700 000002', 'david@example.com', 'cleaning', '2026-05-18', '11:00', '11:45', 'confirmed', 'client', 'New patient.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO blocked_dates (id, practice_id, blocked_date, reason) VALUES
  ('block-date-2026-05-22', 'practice_001', '2026-05-22', 'Practice closed / leave day')
ON CONFLICT (practice_id, blocked_date) DO NOTHING;

INSERT INTO blocked_times (id, practice_id, blocked_date, start_time, end_time, reason) VALUES
  ('block-lunch-2026-05-18', 'practice_001', '2026-05-18', '13:00', '14:00', 'Lunch break'),
  ('block-training-2026-05-19', 'practice_001', '2026-05-19', '15:00', '17:00', 'Staff training')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_settings (id, practice_id, reminder_one_day, reminder_one_hour, push_enabled, sms_fallback_enabled) VALUES
  ('notify-practice-001', 'practice_001', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO embed_settings (id, practice_id, allowed_domain, embed_enabled) VALUES
  ('embed-practice-001', 'practice_001', NULL, TRUE)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- Source migration: 0002_multi_practitioner_prep.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS practitioners (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Dentist',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practitioner_working_hours (
  id TEXT PRIMARY KEY,
  practitioner_id TEXT NOT NULL REFERENCES practitioners(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(practitioner_id, day_of_week, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS practitioner_procedures (
  practitioner_id TEXT NOT NULL REFERENCES practitioners(id),
  procedure_id TEXT NOT NULL REFERENCES procedures(id),
  PRIMARY KEY (practitioner_id, procedure_id)
);

CREATE TABLE IF NOT EXISTS practitioner_blocked_times (
  id TEXT PRIMARY KEY,
  practitioner_id TEXT NOT NULL REFERENCES practitioners(id),
  blocked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS practitioner_id TEXT REFERENCES practitioners(id);
CREATE INDEX IF NOT EXISTS bookings_practice_practitioner_date_idx ON bookings(practice_id, practitioner_id, booking_date, start_time);
CREATE INDEX IF NOT EXISTS practitioner_blocked_times_idx ON practitioner_blocked_times(practitioner_id, blocked_date, start_time);

INSERT INTO practitioners (id, practice_id, name, role, active, display_order) VALUES
  ('practitioner_001', 'practice_001', 'Dr Sarah Demo', 'Dentist', TRUE, 10),
  ('practitioner_002', 'practice_001', 'Dr James Demo', 'Dentist', TRUE, 20),
  ('hygienist_001', 'practice_001', 'Amina Demo', 'Hygienist', TRUE, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO practitioner_working_hours (id, practitioner_id, day_of_week, start_time, end_time, active) VALUES
  ('pwh-001-mon', 'practitioner_001', 1, '08:30', '17:00', TRUE),
  ('pwh-001-tue', 'practitioner_001', 2, '08:30', '17:00', TRUE),
  ('pwh-001-wed', 'practitioner_001', 3, '08:30', '17:00', TRUE),
  ('pwh-001-thu', 'practitioner_001', 4, '08:30', '17:00', TRUE),
  ('pwh-001-fri', 'practitioner_001', 5, '08:30', '15:00', TRUE),
  ('pwh-002-mon', 'practitioner_002', 1, '09:00', '17:00', TRUE),
  ('pwh-002-wed', 'practitioner_002', 3, '09:00', '17:00', TRUE),
  ('pwh-002-fri', 'practitioner_002', 5, '09:00', '17:00', TRUE),
  ('pwh-hyg-tue', 'hygienist_001', 2, '08:30', '16:00', TRUE),
  ('pwh-hyg-thu', 'hygienist_001', 4, '08:30', '16:00', TRUE)
ON CONFLICT (practitioner_id, day_of_week, start_time, end_time) DO NOTHING;

INSERT INTO practitioner_procedures (practitioner_id, procedure_id) VALUES
  ('practitioner_001', 'checkup'),
  ('practitioner_001', 'filling'),
  ('practitioner_001', 'root-canal'),
  ('practitioner_001', 'emergency'),
  ('practitioner_002', 'checkup'),
  ('practitioner_002', 'filling'),
  ('practitioner_002', 'emergency'),
  ('hygienist_001', 'cleaning')
ON CONFLICT (practitioner_id, procedure_id) DO NOTHING;

UPDATE bookings
SET practitioner_id = 'practitioner_001'
WHERE practice_id = 'practice_001' AND practitioner_id IS NULL;


-- ============================================================
-- Source migration: 0003_slot_interval_30_minutes.sql
-- ============================================================
-- Ver-0.005H: change appointment slot interval from 15 minutes to 30 minutes.
-- This is currently applied at practice level and can later become a tenant-editable setting.
UPDATE practices
SET slot_interval_minutes = 30,
    updated_at = NOW()
WHERE id = 'practice_001';


-- ============================================================
-- Source migration: 0004_client_login_customer_foundation.sql
-- ============================================================
-- Ver-0.013: client login and reusable customer foundation.
-- Customers can exist without a client login account so reception/admin can book walk-in or ad-hoc patients.

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  notes TEXT,
  has_client_login BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customers_practice_name_idx ON customers(practice_id, lower(full_name));
CREATE INDEX IF NOT EXISTS customers_practice_phone_idx ON customers(practice_id, phone);
CREATE INDEX IF NOT EXISTS customers_practice_email_idx ON customers(practice_id, lower(email));

CREATE TABLE IF NOT EXISTS client_accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  login_phone TEXT NOT NULL,
  login_email TEXT NOT NULL,
  otp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_accounts_customer_idx ON client_accounts(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS client_accounts_practice_phone_unique_idx ON client_accounts(practice_id, login_phone);
CREATE UNIQUE INDEX IF NOT EXISTS client_accounts_practice_email_unique_idx ON client_accounts(practice_id, lower(login_email));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings(practice_id, customer_id, booking_date);

INSERT INTO customers (id, practice_id, full_name, phone, email, notes, has_client_login, last_seen_at)
SELECT
  'cust-' || md5(lower(coalesce(max(patient_email), '') || '|' || coalesce(max(patient_phone), '') || '|' || coalesce(max(patient_name), ''))),
  practice_id,
  max(patient_name),
  max(patient_phone),
  max(patient_email),
  'Created from existing booking history during Ver-0.013A migration fix.',
  FALSE,
  max(created_at)
FROM bookings
WHERE customer_id IS NULL
GROUP BY practice_id, lower(coalesce(patient_email, '')), coalesce(patient_phone, ''), lower(coalesce(patient_name, ''))
ON CONFLICT (id) DO NOTHING;

UPDATE bookings b
SET customer_id = 'cust-' || md5(lower(coalesce(b.patient_email, '') || '|' || coalesce(b.patient_phone, '') || '|' || coalesce(b.patient_name, '')))
WHERE b.customer_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM customers c
    WHERE c.id = 'cust-' || md5(lower(coalesce(b.patient_email, '') || '|' || coalesce(b.patient_phone, '') || '|' || coalesce(b.patient_name, '')))
      AND c.practice_id = b.practice_id
  );


-- ============================================================
-- Source migration: 0005_client_otp_login_foundation.sql
-- ============================================================
-- Ver-0.014: client OTP login foundation.
-- This adds one-time login code and lightweight client session tables.
-- Real SMS/email delivery is intentionally not connected yet; the development code is returned by the API for local testing only.

CREATE TABLE IF NOT EXISTS client_login_otps (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  otp_code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_login_otps_customer_idx ON client_login_otps(practice_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS client_login_otps_expiry_idx ON client_login_otps(expires_at);

CREATE TABLE IF NOT EXISTS client_sessions (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_sessions_customer_idx ON client_sessions(practice_id, customer_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS client_sessions_expiry_idx ON client_sessions(expires_at);


-- ============================================================
-- Source migration: 0006_email_otp_phone_identifier.sql
-- ============================================================
-- Ver-0.016: email OTP delivery foundation and phone-first client account identity.
-- Client login accounts are uniquely identified by the full international mobile number.
-- Email is used as the first live OTP delivery channel before SMS is connected, but email is not a unique account identifier.

DROP INDEX IF EXISTS client_accounts_practice_email_unique_idx;
CREATE INDEX IF NOT EXISTS client_accounts_practice_email_idx ON client_accounts(practice_id, lower(login_email));

CREATE UNIQUE INDEX IF NOT EXISTS client_accounts_practice_phone_unique_idx ON client_accounts(practice_id, login_phone);


-- ============================================================
-- Source migration: 0007_client_password_login_foundation.sql
-- ============================================================
-- Ver-0.017: normal client sign-in/sign-up foundation.
-- OTP is kept for first-time phone verification only. Returning clients sign in with mobile number + password.

ALTER TABLE client_accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE client_accounts ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

UPDATE client_accounts
SET phone_verified_at = verified_at
WHERE phone_verified_at IS NULL AND verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS client_accounts_verified_phone_idx ON client_accounts(practice_id, login_phone, verified_at);


-- ============================================================
-- Source migration: 0008_admin_staff_login_audit_foundation.sql
-- ============================================================
-- Ver-0.024: admin staff login and stronger audit trail foundation.
-- Master key remains the outer admin gate. Staff login is the second admin identity layer.

CREATE TABLE IF NOT EXISTS admin_staff_members (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Reception',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_staff_members_practice_email_unique_idx
  ON admin_staff_members(practice_id, lower(email));
CREATE INDEX IF NOT EXISTS admin_staff_members_practice_active_idx
  ON admin_staff_members(practice_id, active, updated_at DESC);

CREATE TABLE IF NOT EXISTS admin_staff_sessions (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES practices(id),
  staff_id TEXT NOT NULL REFERENCES admin_staff_members(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_staff_sessions_staff_idx
  ON admin_staff_sessions(practice_id, staff_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS admin_staff_sessions_expiry_idx
  ON admin_staff_sessions(expires_at);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS staff_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_ip TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
CREATE INDEX IF NOT EXISTS audit_logs_practice_created_idx ON audit_logs(practice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_staff_created_idx ON audit_logs(practice_id, staff_id, created_at DESC);


-- ============================================================
-- Source migration: 0009_admin_staff_audit_repair.sql
-- ============================================================
-- Ver-0.024B: safe repair migration for admin staff login and audit trail.
-- This does not edit migration 0008. It safely ensures the required tables,
-- columns and indexes exist if a local/live database marked 0008 as applied
-- without creating every object.

CREATE TABLE IF NOT EXISTS public.admin_staff_members (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Reception',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_staff_members_practice_email_unique_idx
  ON public.admin_staff_members(practice_id, lower(email));
CREATE INDEX IF NOT EXISTS admin_staff_members_practice_active_idx
  ON public.admin_staff_members(practice_id, active, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_staff_sessions (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id),
  staff_id TEXT NOT NULL REFERENCES public.admin_staff_members(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_staff_sessions_staff_idx
  ON public.admin_staff_sessions(practice_id, staff_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS admin_staff_sessions_expiry_idx
  ON public.admin_staff_sessions(expires_at);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  source TEXT NOT NULL DEFAULT 'system',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS staff_name TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_ip TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS audit_logs_practice_created_idx
  ON public.audit_logs(practice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_staff_created_idx
  ON public.audit_logs(practice_id, staff_id, created_at DESC);


-- ============================================================
-- Source migration: 0010_booking_status_flow.sql
-- ============================================================
-- Ver-0.027 booking status flow
-- Adds reception workflow statuses used by the admin diary buttons.

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('confirmed', 'arrived', 'completed', 'billing', 'rescheduled', 'cancelled', 'no_show'));

CREATE INDEX IF NOT EXISTS bookings_status_updated_idx ON bookings(practice_id, status, updated_at);


-- ============================================================
-- Source migration: 0011_clients_extended_profile_foundation.sql
-- ============================================================
-- Ver-0.028 Clients extended profile foundation
-- Adds richer admin-only client profile fields, family member listing and document storage metadata/content.

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS id_passport_info TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS medical_insurance_name TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notification_app_push BOOLEAN DEFAULT TRUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT TRUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN DEFAULT TRUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS allergies_medical_alerts TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS public.customer_family_members (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  relationship TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_family_members_customer_idx
  ON public.customer_family_members(practice_id, customer_id, full_name);

CREATE TABLE IF NOT EXISTS public.customer_documents (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  file_data_base64 TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_documents_customer_idx
  ON public.customer_documents(practice_id, customer_id, uploaded_at DESC);


-- ============================================================
-- Source migration: 0012_saas_tenant_foundation.sql
-- ============================================================
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


-- ============================================================
-- Source migration: 0013_practice_settings_foundation.sql
-- ============================================================
-- Ver-0.031 Practice Settings Foundation
-- Adds editable practice configuration fields while preserving the current demo behaviour.

ALTER TABLE practices ADD COLUMN IF NOT EXISTS public_display_name TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS practice_address TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS practice_phone TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS practice_email TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS lunch_break_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS lunch_break_start TIME;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS lunch_break_end TIME;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS allow_same_day_bookings BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE practices ADD COLUMN IF NOT EXISTS cancellation_policy_note TEXT;

UPDATE practices
SET
  public_display_name = COALESCE(public_display_name, name),
  practice_address = COALESCE(practice_address, 'Demo practice address'),
  practice_phone = COALESCE(practice_phone, '+254 700 000000'),
  practice_email = COALESCE(practice_email, 'info@zipbook.app'),
  logo_url = COALESCE(logo_url, ''),
  lunch_break_enabled = COALESCE(lunch_break_enabled, FALSE),
  lunch_break_start = COALESCE(lunch_break_start, '13:00'),
  lunch_break_end = COALESCE(lunch_break_end, '14:00'),
  allow_same_day_bookings = COALESCE(allow_same_day_bookings, TRUE),
  cancellation_policy_note = COALESCE(cancellation_policy_note, 'Cancellation and reschedule rules will be expanded in a later build.'),
  updated_at = NOW()
WHERE id = 'practice_001';

CREATE INDEX IF NOT EXISTS procedures_practice_active_order_idx ON procedures(practice_id, active, display_order, name);
CREATE INDEX IF NOT EXISTS practitioners_practice_active_order_idx ON practitioners(practice_id, active, display_order, name);
CREATE INDEX IF NOT EXISTS practitioner_procedures_procedure_idx ON practitioner_procedures(procedure_id);

INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
VALUES (
  'audit-practice-settings-foundation-0013',
  'practice_001',
  'practice_settings_foundation_applied',
  'practice',
  'practice_001',
  'migration',
  '{"version":"0.031","note":"Editable practice settings, working hours foundation, procedures and practitioner management foundation added."}'::jsonb
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- Supabase setup verification queries
-- ============================================================
-- Run these after setup if you want to check the core objects exist.
-- They are SELECT-only and safe.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'practices',
    'tenant_domains',
    'procedures',
    'practitioners',
    'practitioner_working_hours',
    'practitioner_procedures',
    'bookings',
    'customers',
    'customer_family_members',
    'customer_documents',
    'client_accounts',
    'client_sessions',
    'client_otp_codes',
    'admin_staff_members',
    'admin_staff_sessions',
    'audit_logs'
  )
ORDER BY table_name;

SELECT id, tenant_slug, name, public_display_name, timezone, currency_code
FROM public.practices
WHERE id = 'practice_001';
