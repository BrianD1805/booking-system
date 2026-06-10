# Ver-0.025 — Admin Button Feedback and Toast Notifications

Built on top of Ver-0.024B.

## Scope
- Admin-side only.
- Client-facing home page remains locked and unchanged.
- No database migration required.

## Changes
- Added a reusable admin toast notification host.
- Added toast notifications for admin saves, adds, deletes, refreshes and key admin actions.
- Added animated loading/spinner feedback for admin buttons, especially refresh buttons.
- Added general button hover/active interaction feedback across the app UI.
- Updated diary, reception, customer data, staff and audit admin pages to show clearer busy states.

## Files of note
- `components/admin/AdminToast.tsx`
- `components/admin/AdminAuthGate.tsx`
- `lib/useBookingDatabase.ts`
- `app/admin/page.tsx`
- `app/admin/reception/page.tsx`
- `app/admin/data/page.tsx`
- `app/admin/staff/page.tsx`
- `app/admin/audit/page.tsx`
- `app/globals.css`

## Versioning
- App version bumped to Ver-0.025.
- Service worker cache bumped to zipbook-v0.025.
- Package version bumped to 0.0.25.
