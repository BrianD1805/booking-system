# ZipBook Ver-0.013A — Client Login Foundation and Admin Customer Search Plan

## Purpose

This patch lays the foundation for customer-side login while keeping admin/reception booking flexible.

The key product rule is:

- Client login is for the customer-facing app only.
- Admin/reception must still be able to create confirmed bookings for walk-in or ad-hoc patients who do not have a client login account.

## Added in Ver-0.013A

### Database foundation

A new immutable migration has been added:

- `netlify/database/migrations/0004_client_login_customer_foundation.sql`

It adds:

- `customers`
- `client_accounts`
- `bookings.customer_id`
- indexes for customer search by name, phone and email
- migration backfill from existing booking history into customer records

### Client app foundation

The client app now has a visible login foundation card:

- `Client login`
- `Continue as guest`
- phone/email fields for a future one-time-code login

OTP delivery is not connected yet. This is intentionally a safe foundation layer before adding live authentication.

### Admin app foundation

The admin booking flow now has a customer search step in patient details:

- search by name, phone or email
- select an existing customer
- auto-fill patient details
- choose ad-hoc patient mode for walk-ins or new patients

Ad-hoc admin bookings still create/update a customer record, but they do not create a client login account.

## Next recommended login build

Ver-0.014 should add the real OTP/login process:

1. Create a one-time-code table.
2. Send OTP by SMS first, email fallback second.
3. Add verify-code endpoint.
4. Store a safe session token/cookie for the client app only.
5. Add "My bookings" for logged-in clients.
6. Allow logged-in clients to copy booking details, cancel or request reschedule depending on practice settings.

## Important safety note

Do not treat admin-created customer records as client login accounts. A customer becomes a login customer only after they verify their phone/email through the client app.
