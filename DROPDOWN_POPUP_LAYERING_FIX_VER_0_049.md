# Build Ver-0.049 — Dropdown Popup Layering Fix

## Purpose
Fix the custom dropdowns in booking flows so the open option list appears above the booking popup/card instead of being clipped or hidden underneath the popup scroll area and sticky action bar.

## Changes
- Updated `components/ZipSelect.tsx` so the dropdown menu is rendered in a safe floating layer attached to `document.body`.
- Dropdown menus now use fixed positioning based on the clicked dropdown button.
- Menus automatically open downward or upward depending on available screen space.
- Menus keep a high popup-safe z-index so they remain above booking popups and sticky footer actions.
- The click-outside handler now recognises both the dropdown button and the floating menu.
- Added mobile-safe sizing and scrolling for long dropdown lists.
- Kept the existing ZipBook dropdown look and chevron icon.

## Version updates
- Visible app version: `Ver-0.049`
- Service worker cache: `zipbook-v0.049`
- Package version: `0.0.49`

## SQL
No SQL required.
