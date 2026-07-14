# Build Ver-0.043 — Custom Dropdown Component

## Purpose
Replace the browser-native select dropdown styling with a reusable ZipBook-styled dropdown component that matches the website/app look and feel.

## Changes
- Added reusable `components/ZipSelect.tsx`.
- Replaced native dropdowns in the admin diary practitioner filter.
- Replaced native dropdowns in admin and reception booking flows.
- Replaced native dropdowns in the client booking treatment/practitioner step.
- Replaced client login/reset country-code dropdowns.
- Replaced the DOB calendar month dropdown.
- Added global styling for the new dropdown, including rounded panels, soft shadow, selected state, hover state and mobile-safe sizing.
- Kept existing colours, Ubuntu font and layout.
- No SQL required.
