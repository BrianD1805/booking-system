# Ver-0.028 — Clients Admin Upgrade

Adds a richer admin Clients page at `/admin/data`.

## Scope

- Page title changed from admin data tool / customer data to **Clients**.
- Client search remains protected behind master key + staff login.
- Search now includes main client name/phone/email and family member names.
- Add, edit and delete client records from the admin Clients page.
- Existing client login/password reset controls remain available for saved clients.
- All saves/adds/deletes/password changes are recorded in the audit trail.

## New client fields

- Date of birth
- ID or passport info
- Address
- Medical insurance name
- Notification preferences: App Push, Email, SMS
- Emergency contact name and phone
- Medical alerts / allergies
- Preferred language
- Preferred contact time
- Notes

## Family members

Admin can list family members with name and date of birth.
This is a listing only for now. Searching a family member name returns the main client record.

## Documents

Admin can upload small demo documents against a client profile.
Files are stored in the database as base64 for now, with a 2 MB UI limit per document.
This is acceptable for demos, but later production storage should move documents to proper file/object storage before live medical-document use.

## Database

Adds migration:

`netlify/database/migrations/0011_clients_extended_profile_foundation.sql`

Do not edit previous applied migrations.
