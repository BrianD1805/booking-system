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
