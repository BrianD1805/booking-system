# ZipBook Ver-0.041C — Calendar Clear Button Fix

Ver-0.041C fixes a runtime error found during local testing after the Ver-0.041A calendar positioning update.

## Issue fixed

Clicking **Clear** on the admin diary date calendar could set the operational diary date to an empty string. The admin page then tried to render the diary heading using that empty value, which caused:

```text
Runtime RangeError: Invalid time value
```

## Changes

- Diary and booking workflow date pickers are now marked as required, so the Clear action is not shown there.
- Optional date fields, such as client date of birth and family member date of birth, still allow Clear.
- Added a safer date parser in the shared availability helper.
- `getDayLabel()` now returns `Select a date` instead of throwing if it receives an invalid or empty date.
- No layout changes.
- No database changes.

## Files affected

- `components/DatePickerField.tsx`
- `lib/availability.ts`
- `app/admin/page.tsx`
- `app/admin/reception/page.tsx`
- version/cache/package references

## Testing

- TypeScript passed with `npm run typecheck`.
- Next.js compiled successfully and completed route generation output during `npm run build` in the tool environment; the container timed out before the process returned to the shell, so Brian should still run the normal local build before deploy.
