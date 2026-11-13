# ZipBook Ver-0.053 — Client flow and past booking protection

- Reception: once an existing client is selected, Step 1 shows `Client Selected: <name>` without the two selection cards; the receptionist is automatically scrolled/focused to Step 2, where the selected client's name appears in the heading. Change/Clear stay available.
- Admin Clients: the search field is first and the results display immediately underneath within the same card. Security/audit explanatory text follows the results.
- Prevent bookings in the past for **all** booking sources: receptionist, admin and client. Start times are checked in the practice's configured IANA timezone; earlier dates and already-started slots are blocked. Both new bookings and edited/rescheduled bookings are protected by a shared server-side guard before any data is written. Status changes to historic appointments remain possible.
- The date picker for new bookings prevents choosing dates before the practice's current day. Historic diary navigation remains available.
- Added `npm run test:booking-time` for timezone, expired slot, past date and invalid date/time regression coverage.
- No database schema changes or Supabase SQL needed.
- Recommended local commands: npm install; npm run test:heartbeat; npm run test:booking-time; npm run typecheck; npm run build; netlify dev --no-open.
