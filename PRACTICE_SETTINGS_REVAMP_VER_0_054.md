# ZipBook Ver-0.054 — Practice Settings and Clinician Diary

Based on full Ver-0.053A baseline. Client /book home page intentionally unchanged.

## User-facing changes
- `/admin/settings` redesigned into concise overview cards and separate edit popups; every popup has its own Save and Cancel actions.
- Practice profile, opening days/hours, booking rules, procedures, practitioner records edited in responsive centred popups (fixed heading/actions, scrollable interior, background scroll locked).
- Practice closing-time changes show in the refreshed diary. The practice boundary is not the same as each practitioner's working schedule. The hours popup offers **adjust matching practitioner boundaries** (default) or **set all active clinician shifts to practice hours** (explicit, overwrites custom shift times).
- Select a practitioner in the ZipBook dropdown to view/manage all 7 working days, hours, optional individual lunch periods and scheduled absences.
- Add one-day/multi-day leave, sickness, meeting/training or partial-day absences. Existing conflicting bookings must be rescheduled first. Leave is removable in the interface.
- New practitioners get weekly working-day defaults based on practice hours.
- Prevent existing future appointments from becoming unavailable through edits to opening hours or a clinician's weekly schedule.
- Practice/clinician lunch restrictions and general operating hours are now checked both in client/diary availability previews and the booking API.
- Client online booking rules (minimum notice, max-ahead, same-day) also enforced server-side. Staff can make urgent bookings while still obeying hours/leave.
- Avoid stale bootstrap/settings data between serverless instances on explicit screen refresh.

## First deployment: REQUIRED Supabase SQL
Run `supabase/zipbook_practitioner_schedules_ver_0_054.sql` in Supabase SQL Editor **BEFORE** deploying or testing Ver-0.054 against the live database. It adds 3 lunch columns to existing `practitioner_working_hours` and `series_id` to `practitioner_blocked_times` (safe, additive, repeatable). There is no data reset.

## Note on practice-wide and individual lunch
The practice-wide lunch toggle is intended only for periods when **all** clinicians stop working. The per-clinician lunch toggle is in the selected practitioner's Weekly diary popup. They are independent; either blocked period prevents overlapping bookings for the affected clinician.

## Verification
Run tests (heartbeat, booking-time, scheduling), `npm run typecheck`, `npm run build`, then `netlify dev --no-open`. Full Node deps are needed for typecheck/build. Test from browser: practice close at 18:00; extended doctor shifts; custom short shift; different lunch per clinician; conflicts with existing bookings; several days of leave and removal; custom dropdown and popup controls on mobile; procedure/practitioner edit flows; cancellation and client booking restrictions.
