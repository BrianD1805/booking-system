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
