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
