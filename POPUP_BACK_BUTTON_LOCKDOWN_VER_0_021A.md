# ZipBook Ver-0.021A — Popup Back Button Lockdown

This patch fixes the modal visibility bug introduced during the Ver-0.021 premium popup polish.

## Fixes

- Restores the hidden state for the booking workflow when `bookingOpen` is false.
- Adds an explicit CSS guard so `.booking-workflow:not(.is-open)` cannot be displayed by shared popup styling.
- Keeps `.booking-workflow.is-open` visible only when the React state says the booking popup should be open.
- Adds a lightweight browser back-button handler so open client popups close cleanly instead of trapping the user or navigating unexpectedly.
- Checks the close buttons and back buttons for the booking flow, time selector and login/sign-up popup.

## Why this happened

Ver-0.021 grouped all popup containers together for consistent premium styling. Because `.booking-workflow` is always present in the DOM and only hidden by CSS, the grouped `display: grid` rule overrode the earlier `display: none` rule. That made the booking popup appear even when React state had closed it.

No database changes.
