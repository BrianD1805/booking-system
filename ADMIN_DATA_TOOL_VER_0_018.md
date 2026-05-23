# ZipBook Ver-0.018 — Protected Admin Data Tool

This build adds a small protected admin data tool at `/admin/data`.

## Purpose

The tool is designed for controlled admin maintenance while the project is still in development:

- View customers.
- Search by name, phone or email.
- Edit customer name, phone, email and notes.
- Set a temporary client password for accounts created before password login existed.
- Delete a test customer together with linked bookings, sessions, OTPs and client login account.

## Protection

The API routes require the `ZIPBOOK_ADMIN_DATA_KEY` environment variable. The page asks for the key and sends it as a protected header.

For local development only, if no environment variable is configured, the key `zipbook-admin-dev` is accepted.

For live use, add a real Netlify environment variable and do not use the development key.

## Routes added

- `/admin/data`
- `/api/admin-data/customers`
- `/api/admin-data/customers/[id]`
- `/api/admin-data/customers/[id]/password`

## Database

No database migration is required for this build.
