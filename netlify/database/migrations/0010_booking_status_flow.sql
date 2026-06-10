-- Ver-0.027 booking status flow
-- Adds reception workflow statuses used by the admin diary buttons.

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('confirmed', 'arrived', 'completed', 'billing', 'rescheduled', 'cancelled', 'no_show'));

CREATE INDEX IF NOT EXISTS bookings_status_updated_idx ON bookings(practice_id, status, updated_at);
