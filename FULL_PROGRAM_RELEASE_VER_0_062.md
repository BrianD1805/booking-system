# ZipBook / Booking System — Ver-0.062 Full Programme

Base: the exact full Ver-0.061C programme ZIP. Full-source release (not a patch).

## Purpose
Integrate the existing booking engine safely into the independently hosted SaaS tenants. **Do not** automatically enable public bookings for any business. New tenants remain guest-only until the platform operator intentionally opens each business in Platform Administration. No ZipBook billing is added; ZippyWeb remains the future central billing service.

## Changes
- Preserve public booking API gating and tenant resolution by verified hostname. Regression tests cover the pre-publication block, confirmed platform publish action, private-field filtering and authenticated client binding.
- Server rejects a nonexistent/inactive/foreign service before calculating the appointment duration; practitioner-service join also requires an active same-practice service.
- NEW SQL migration `supabase/zipbook_public_bookings_ver_0_062.sql` installs a tenant-aware `BEFORE INSERT/UPDATE` booking trigger. It takes a transaction-level advisory lock per practice/practitioner/date and checks overlapping time intervals after acquiring the lock. This closes the race between two simultaneous requests without rewriting old appointments. No extension required.
- Confirmation emails for independent SaaS businesses identify the business and use generic service terminology; the existing legacy practice email wording is unchanged.
- An overlapping attempt receives HTTP 409 with a safe message instructing the customer to select a different slot. Internal SQL error text is no longer returned by booking creation.
- `test:public-booking` adds static contract and pure error mapping tests. Live concurrent booking and cross-tenant testing are still REQUIRED; source tests cannot prove a live Supabase trigger.

## Required SQL and manual acceptance
1. Run `supabase/zipbook_public_bookings_ver_0_062.sql` in the Supabase SQL Editor **before deploying or opening public bookings**. This is an idempotent migration and does not change existing appointments.
2. Install the full programme ZIP and run the local automated tests, dependency audit, typecheck and build.
3. Publish via GitHub and verify Netlify Published.
4. Keep all businesses closed initially. In Platform Administration, run Readiness check for a controlled test business, then explicitly select **Open public bookings** for **that business only**. Test a future guest booking with an email inbox you control.
5. Check it appears ONLY in that business's diary, with confirmation email; verify other test tenants remain closed or isolated.
6. For concurrency: using two test browsers, attempt the exact same available practitioner/time. Only one booking should be committed; the other should see a "time just taken" error. Verify one diary booking, not two. Avoid sending real customers test email.
7. Test cancellation/rebooking, timezone and configured working hours on the selected tenant; verify public availability responses contain no patient personal information.

## Boundaries
- Existing public `/book` layout and Ver-0.021 popup design preserved.
- Existing staff/Owner authentication, branding, PWA, iframe integration and diary design unchanged.
- New SaaS customer login is NOT implemented in this release; guests can book when an operator has enabled that business.
- ZippyWeb Stripe subscription entitlements and customer plans are a future integration, not included here.
- No live deployment, database migration or live appointment test was performed by the authoring environment.
