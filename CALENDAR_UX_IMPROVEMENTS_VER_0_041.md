# ZipBook Ver-0.041 — Calendar UX Improvements

Ver-0.041 replaces the old browser-native date picker UI with a reusable ZipBook calendar picker.

## What changed

- Added a shared `DatePickerField` component.
- Replaced native `type="date"` controls across the client booking app, admin diary, reception booking flow, and client detail editor.
- Calendar now opens directly below the date field on desktop instead of floating away from the clicked control.
- Calendar uses ZipBook styling, Ubuntu font, the existing Ver-0.040 colour palette, rounded panels and modern controls.
- Mobile uses a bottom-sheet style calendar popup so it does not get clipped by narrow screens.
- Date display now uses British `dd/mm/yyyy` format while the internal saved value remains ISO `yyyy-mm-dd`.
- No SQL migration is required.

## Files changed

- `components/DatePickerField.tsx`
- `app/book/page.tsx`
- `app/admin/page.tsx`
- `app/admin/reception/page.tsx`
- `app/admin/data/[id]/page.tsx`
- `app/globals.css`
- `lib/mockData.ts`
- `lib/domains.ts`
- `public/sw.js`
- `package.json`
- `package-lock.json`

## Testing focus

- Open `/book`, choose a booking date and confirm the popup opens next to the field.
- Open `/admin`, choose a diary date and confirm the diary refreshes.
- Open admin reception booking and confirm the date picker works in the booking flow.
- Open a client detail page and confirm date of birth and family member date fields still save correctly.
