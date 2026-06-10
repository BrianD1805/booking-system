# Ver-0.023B — Reception Client Search Popup Repair

## Purpose
Fix the receptionist client search so it opens as a real modal popup instead of rendering like a card near the bottom of the page.

## Changes
- Changed the client search overlay on `/admin/reception` to use the same fixed popup overlay behaviour as the other app popups.
- Forced the reception client search modal to centre vertically and horizontally.
- Added fixed inset overlay, darkened/blurred backdrop, hidden page overflow, centred card, internal scrolling popup body, and sticky-style header/footer behaviour.
- Kept the guided receptionist booking flow from Ver-0.023A.
- Kept the client-facing home page locked and unchanged.
- No database migration required.

## Version
- Visible app version bumped to Ver-0.023B.
- Service worker cache bumped to zipbook-v0.023B.
- Package version bumped to 0.0.23-b.
