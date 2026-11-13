-- ZipBook Ver-0.054: individual practitioner weekly lunch breaks and grouped leave.
-- Run once (safe to repeat) in Supabase SQL Editor BEFORE deploying Ver-0.054.
-- Preserves all existing practitioners, schedules, blocked times and bookings.
BEGIN;
ALTER TABLE public.practitioner_working_hours
  ADD COLUMN IF NOT EXISTS lunch_break_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lunch_break_start TIME NOT NULL DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS lunch_break_end TIME NOT NULL DEFAULT '14:00';
ALTER TABLE public.practitioner_blocked_times
  ADD COLUMN IF NOT EXISTS series_id TEXT;
CREATE INDEX IF NOT EXISTS zipbook_practitioner_leave_series_054_idx
  ON public.practitioner_blocked_times (practitioner_id, series_id);
COMMIT;

-- Optional verification (expected: three lunch columns and a series_id column)
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'practitioner_working_hours' AND column_name IN ('lunch_break_enabled','lunch_break_start','lunch_break_end'))
    OR (table_name = 'practitioner_blocked_times' AND column_name = 'series_id'))
ORDER BY table_name, column_name;
