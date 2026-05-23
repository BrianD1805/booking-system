# Ver-0.021C — Login/Sign-up Popup Responsive Fix

This patch repairs the client login/sign-up popup only.

The client-facing home page remains locked and was not visually redesigned.

## Fixes

- Locks the login/sign-up popup to the viewport so it cannot drift left/right on mobile swipe.
- Centres the popup vertically and horizontally.
- Keeps the popup card inside the mobile viewport.
- Centres the Login / Sign up toggle.
- Makes the toggle slightly smaller and more robust on narrow screens.
- Keeps popup scrolling inside the popup body.
- Keeps the sticky header and sticky bottom actions pattern from Ver-0.021.
- Prevents horizontal overflow on the auth popup.

## Locked popup styling reminder

Future popups should follow the Ver-0.021 standard: centred modal, sticky header/title, sticky bottom actions where applicable, internal contained scrolling, bleed space below sticky header, and comfortable bottom spacing on desktop and mobile.
