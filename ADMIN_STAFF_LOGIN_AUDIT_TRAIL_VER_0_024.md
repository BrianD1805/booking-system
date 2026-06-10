# Ver-0.024 — Admin Staff Login and Audit Trail

## Scope
Adds a second admin identity layer for receptionist/admin staff after the master key gate.

## Included
- Admin staff login gate on all `/admin` pages.
- Master key remains the first gate.
- Staff email/password login is the second gate.
- First staff login can be created after the master key when no staff records exist yet.
- Staff management page at `/admin/staff`.
- Audit trail page at `/admin/audit`.
- New migration `0008_admin_staff_login_audit_foundation.sql`.
- Admin bookings, booking updates/deletes, customer edits/deletes/password changes, staff changes and demo cleanup are audit-recorded.

## Notes
Client-facing home page was not changed.
No client booking UI was changed.
