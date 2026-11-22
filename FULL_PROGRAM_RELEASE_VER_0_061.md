# Booking System — Ver-0.061 Full Programme Release

**Baseline:** Ver-0.060A full ZIP. **Type:** Multi-business SaaS readiness and live database-isolation verification.

Changes:
- Added an operator-only **Readiness check** in Platform Administration for each registered pilot business.
- Reports invitation verification, active Owner login, diary activation, configured practitioners/services/hours, separate public-booking activation status and optional website/logo settings.
- Added fail-closed, **read-only** cross-practice role/RLS audit for nine scoped tables using the real `zipbook_tenant_runtime` role and its transaction-local practice context, checked in both directions.
- Added six automated tests for readiness classification, operator guard and isolation-audit code contracts (`npm run test:readiness`).
- Preserved Ver-0.060A client-logo first-paint fix, Ver-0.059 eager booking iframe, existing UI/popup styles, onboarding/invitation code and security fixes.

**Not done:** No new customer login, no live public booking activation, no automated external DNS or inbox verification, no subscriptions/billing, and no automated account creation or real-record modification. A second test business is to be created manually by the operator for acceptance testing.

**SQL:** No additional Supabase SQL required. Existing tenancy, website-integration and business-branding migrations must be installed.

**Security:** Do not share the platform key, business Owner credentials, Supabase credentials or invitation tokens. The audit is operator-only and does not read or return private customer/appointment records. It does not replace live end-to-end isolation testing.

See `SAAS_MULTI_BUSINESS_READINESS_VER_0_061.md` for a complete hands-on pilot acceptance checklist.
