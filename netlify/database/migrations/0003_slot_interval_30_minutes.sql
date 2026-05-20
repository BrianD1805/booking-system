-- Ver-0.005H: change appointment slot interval from 15 minutes to 30 minutes.
-- This is currently applied at practice level and can later become a tenant-editable setting.
UPDATE practices
SET slot_interval_minutes = 30,
    updated_at = NOW()
WHERE id = 'practice_001';
