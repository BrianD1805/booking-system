# Ver-0.024B — Admin Staff Audit Repair Migration

Purpose: safe follow-up repair after migration 0008 was already marked as applied.

Changes:
- Added migration `0009_admin_staff_audit_repair.sql`.
- Uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- Ensures `admin_staff_members`, `admin_staff_sessions`, and `audit_logs` exist.
- Ensures audit columns `staff_id`, `staff_name`, `request_ip`, and `user_agent` exist.
- Adds/repairs the needed indexes.

No existing applied migration is edited.
Client-facing home page remains locked and unchanged.
