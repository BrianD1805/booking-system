# ZipBook Ver-0.042B — Password Eye Icon Movement Fix

Ver-0.042B fixes the remaining hover movement on password reveal eye buttons.

## Changes

- Added stronger CSS overrides for all `.admin-password-eye` controls.
- Prevented generic button hover and active rules from moving or scaling the password reveal button.
- Locked the icon position on hover, focus, focus-visible and active states.
- Locked the SVG eye paths so the eye graphic itself does not shift.
- Kept the crossed/slashed-eye behaviour from Ver-0.042A.
- No SQL required.

## Version updates

- Visible app version: Ver-0.042B
- Service worker cache: zipbook-v0.042B
- package.json: 0.0.42-b.0
