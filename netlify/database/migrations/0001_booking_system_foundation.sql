CREATE TABLE IF NOT EXISTS practices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  booking_subdomain TEXT NOT NULL,
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  working_start_time TIME NOT NULL DEFAULT '08:30',
  working_end_time TIME NOT NULL DEFAULT '17:00',
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
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
  30, 2, 90, TRUE, TRUE, 'Dedicated Netlify Database first, later expandable to a shared SaaS database with strict tenant separation.'
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
