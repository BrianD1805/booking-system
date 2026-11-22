# ZipBook Ver-0.061 — Multi-Business SaaS Readiness & Isolation Checks

Baseline: full Ver-0.060A programme. This release does **not** enable public bookings or customer account sign-in and does **not** change the approved `/book` home or popup styling.

## New operator check

At `https://zipbook.app/platform`, sign in using the separate platform key. Every pilot business now has a **Readiness check** button. The modal reports:

- Owner invitation accepted and active Owner account configured
- Business Practice Diary enabled (platform activation)
- At least one active practitioner with working hours and an assigned active service
- Public booking activation status (informational; remains gated until operator publishes)
- Authorised website snippets and uploaded business logo (optional)
- A **read-only** RLS and cross-practice visibility audit

The audit checks nine tenant-scoped tables for restrictive RLS policies applied to `zipbook_tenant_runtime`; it then uses `SET LOCAL ROLE zipbook_tenant_runtime` with the two different practice IDs and checks that each can see itself but not the other practice. The audit makes no writes. It chooses a different registered pilot where one exists, otherwise a separate existing practice. If no counterpart exists it reports that fact, not a pass. A failed or unavailable audit **does not** automatically change platform state or open customer bookings. The report contains aggregate technical states only, not appointment, client or password data.

**Important:** This operational check is not a complete live/browser security penetration test and does not test every possible data path, cookie, iframe, booking submission or account workflow. Tenant-isolation failures must be investigated before onboarding paying customers.

## Manual acceptance — add a second controlled test business

1. Keep the current Demo Dental practice available as the first business. In Platform Administration choose **Add business** and provide a unique lowercase business prefix and a real email inbox you control. Do not use a real customer's data for this test.
2. Confirm the new subdomain has a valid Netlify DNS and HTTPS configuration before enabling the diary. Check that the 48-hour invitation arrives, click the invitation link and set a separate Owner password.
3. As Platform operator, enable **diary** for the new business only. Confirm public bookings remain disabled. Open its `/admin` as Owner and configure a practitioner, active service, assigned service, working hours and a logo.
4. Run **Readiness check** on BOTH businesses. Verify invitation/Owner/diary/practitioner results and the RLS check. A missing logo or website embed should be shown as optional, not as an isolation failure.
5. Open each business in separate private/incognito browser sessions. Confirm one business's staff credentials do not sign in to the other; each diary only shows its own practitioners, services, customers and appointments. Test creation/edits with synthetic data only. Do not expose or copy real patient/client data.
6. Authorise a separate HTTPS test website for the second business and copy its own public booking and secure staff diary snippets. Confirm the business hostname in each snippet is correct and neither business's logo or booking page branding appears in the other's tenant.
7. Suspend only the second business. Confirm its staff sessions are revoked and its business subdomain no longer resolves as an active diary while Demo Dental remains accessible. Re-activation requires platform confirmation and may be tested only if desired.
8. Keep public booking submissions disabled until the separate controlled end-to-end public-booking release. The new readiness audit does **not** automatically publish a business.

## Technical notes

- No additional Supabase migration or new Netlify environment variable is required. The existing Ver-0.056, Ver-0.057, Ver-0.058 and Ver-0.060 migrations must already be applied.
- `GET /api/platform/readiness?id=practice-...` runs only on the platform host, requires the independent platform security key, does not cache data, and returns only technical configuration / audit states.
- It does not call tenant booking APIs with a privileged connection. Tenant API access remains scoped as in Ver-0.060A.
- Production browser/Netlify testing is needed to confirm the live DB role, RLS permissions, onboarding email and app behaviours.
