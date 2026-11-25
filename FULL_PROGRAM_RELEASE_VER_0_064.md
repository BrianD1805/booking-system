# ZipBook Ver-0.064 — Business Onboarding & Staff Account Recovery

Apply `supabase/zipbook_staff_recovery_ver_0_064.sql` before deploying. Back up first. Existing business settings and bookings are retained. The migration distinguishes previously suspended businesses using historical suspend audit events and current disabled state; review legacy status manually if history is missing.

New diary and live emails are triggered on activation/publish and can be resent explicitly from Platform. Existing active tenants can use resend without toggling access. Delivery status is refreshed manually by retrieving the latest provider event per email type. An accepted send is not a confirmed delivery. Set optional server-only `ZIPBOOK_RESEND_STATUS_KEY` if the existing sending key cannot retrieve email information. No webhooks or scheduled polling are introduced. No historical delivery events are reconstructed. Resend is called after activation commits: failures do not undo access; use resend if needed.

Staff password recovery uses the business host, tenant-scoped database transactions, hashed single-use 30-minute tokens, tenant and per-account request budgets, generic request messages, and session revocation. Legacy diary requires the master key before requesting recovery; demo requests are denied. Suspended businesses cannot use the recovery route until enabled. Reset links use a URL fragment and the reset page is never cached. Password changes send a confirmation email; if email delivery fails the password is still changed. No passwords are sent in emails.

Run all package test scripts, npm audit --omit=dev, typecheck and build before deploying. Live email delivery, database RLS, reset race and expiry, and multi-tenant acceptance tests are required before production use.
