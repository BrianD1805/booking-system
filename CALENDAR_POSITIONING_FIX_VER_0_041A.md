# ZipBook Ver-0.041B — Calendar Positioning Fix

Ver-0.041B refines the custom ZipBook calendar positioning introduced in Ver-0.041.

## Changes

- Calendar popup now renders in a portal so it is not clipped by cards, panels or popup containers.
- Desktop calendar opens over/near the clicked calendar button and is clamped inside the visible viewport.
- Desktop calendar no longer drops below the bottom edge when the date field is low on the screen.
- Mobile calendar is centred on the page instead of opening as a bottom sheet.
- When opened from an existing popup, the calendar appears centred over the visible popup/page area rather than being pushed off-screen.
- Existing date behaviour is unchanged: user display remains `dd/mm/yyyy` and stored value remains `yyyy-mm-dd`.
- No SQL required.

## Files changed

- `components/DatePickerField.tsx`
- `app/globals.css`
- Version/cache references
