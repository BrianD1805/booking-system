# ZipBook Ver-0.018B — Admin Data Tool Password Save Fix

This patch fixes the protected admin data tool password reset flow.

Changes:
- Password save now verifies that the selected customer has a password immediately after saving.
- The customer phone is normalised to a full international login number before saving the client account password.
- The client account row is found by either customer ID or login phone, which helps older customer records created before password login existed.
- Admin data customer listing now prefers a single latest/password-enabled client account record, avoiding confusing duplicate account rows.
- The admin data page now shows clearer password status and a Save/Reset password button.

No database migration changes.
