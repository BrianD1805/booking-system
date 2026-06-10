# Ver-0.028C - Past Slot Logic for Reception and Client Booking

- Applied the same passed-time logic from the admin diary slots view to the Reception add-booking page.
- Applied the same passed-time logic to the client booking time picker.
- For today's date, slots whose end time has already passed are now greyed out and cannot be selected.
- Client available-times count now excludes passed slots.
- Reception add-booking slot cards now show `Time passed` and `No longer available today`.
- No database migration required.
- Client-facing home page layout was not changed.
