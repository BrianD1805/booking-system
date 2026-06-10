# Ver-0.023A — Reception Booking Flow with Client Search Popup

Purpose: replace the first version of the Reception booking page layout with a clearer step-by-step flow.

Changes:
- Reception booking remains a full page at `/admin/reception`.
- Client selection now opens in a dedicated popup instead of showing search results inline on the page.
- Receptionist can search by name, phone or email inside the popup.
- Selecting a client closes the popup and returns to the booking flow with the client selected.
- Ad-hoc patient mode remains available for walk-ins or patients without an account.
- Main booking page now follows one guided flow: Client, Appointment, Confirm.
- Existing duration-aware slot selection and coverage highlighting is preserved.
- Existing booking API is reused.
- No database migration required.
- Client-facing home page remains locked and unchanged.
- Visible app version bumped to Ver-0.023A.
- Service worker cache bumped to zipbook-v0.023A.
