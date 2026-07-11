# ZipBook Ver-0.041C — DOB Year Picker Calendar

Ver-0.041C improves the custom ZipBook calendar for date of birth fields.

## What changed

- Booking and diary date fields keep the simple month-by-month calendar.
- Client date of birth fields now use DOB mode.
- Family member date of birth fields now use DOB mode.
- DOB fields allow manual typing in `dd/mm/yyyy` format.
- If a user types a valid DOB, it is saved internally as `yyyy-mm-dd`.
- If a user types or includes a year, the calendar opens in that year.
- DOB calendars include month and year jump controls in the calendar header.
- DOB defaults to a sensible range from 1900 to today.
- No SQL required.

## Files changed

- `components/DatePickerField.tsx`
- `app/admin/data/[id]/page.tsx`
- `app/globals.css`
- `lib/domains.ts`
- `lib/mockData.ts`
- `public/sw.js`
- `package.json`
- `package-lock.json`

## Test checklist

- Open a client detail page.
- Type a DOB such as `14/03/1967`.
- Click the calendar icon and confirm it opens in March 1967.
- Change month/year using the new controls.
- Select a date and confirm the field displays `dd/mm/yyyy`.
- Save the client and confirm the date remains correct.
- Test family member DOB fields as well.
- Confirm booking and diary calendars still behave normally.
