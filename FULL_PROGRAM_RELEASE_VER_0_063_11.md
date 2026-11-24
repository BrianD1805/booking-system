# ZipBook Ver-0.063.11 — Practice Time Zone Consistency

Release date: 24 November 2026, UK.

## Change summary

1. Admin Settings > Practice profile: the time zone is now a searchable IANA selector alongside Currency. Saves through the existing validated admin settings endpoint; the existing practice row already contains `timezone` and `currency_code`.
2. Platform > Demo reset defaults: save, display and restore both practice time zone and currency. Older saved reset profiles without these two JSON properties are read with the current practice's values as fallback, and should be resaved by the platform owner to make the defaults explicit.
3. Practice Diary: booking dates, slots, booking confirmations, change alerts, the clock and last-refreshed indicator all follow the practice's configured timezone. No local-device time conversions for demo visitors.
4. Customer Booking App (both guest and account users): appointment dates, slots, booking review, confirmation and booking history show the same practice-local booking values as the diary.
5. Reception: same practice-local date and time rules in the selector and confirmations.
6. Removed all timezone explanation messages from the Customer App, Practice Diary and Reception screen.
7. Existing booking rows are not rewritten or migrated. Date/time fields retain their original stored values. Changing a practice's configured timezone affects interpretation of its wall-clock appointments; review existing bookings before changing a timezone on a live business.
8. The first shown date after the settings API loads is synchronised with the practice's current calendar date if the user has not already changed the selection.

## Database migration and environment variables

**Supabase SQL:** None required. The database already has `practices.timezone`, `practices.currency_code`, and a JSONB `zipbook_demo_reset_profiles.default_settings` column. No `bookings` rows are modified by this release.

**Netlify:** No new environment variables.

## Tests and status

Run `npm run test:practice-time` plus the full existing regression suite. Confirm `npm run typecheck`, `npm audit --omit=dev`, and `npm run build` locally before deployment. No claim of live deployment or live-email testing is made here.
