# ZipBook Ver-0.017B — Safe Live Test Data Cleanup Tool

This patch adds a temporary protected API endpoint for cleaning duplicate Brian test client records and their linked bookings from the live database.

## Endpoint

`/api/admin/cleanup-brian-test-data`

## Safety controls

The endpoint requires:

1. `ZIPBOOK_CLEANUP_KEY` to be set as an environment variable in Netlify.
2. The same key to be supplied in the request query string or `x-zipbook-cleanup-key` header.
3. The POST body to include the exact confirmation phrase and the phone number to keep.

## Record to keep

- Name: Brian David Hallam
- Phone: +254701600529

## Records targeted for deletion

Duplicate/test Brian customer records and bookings matching:

- +254701600529 variants
- 0701600529
- 701600529
- 0707600529
- 707600529
- Any customer/booking name containing Brian, except the kept customer record

## Important

This is intended as a temporary clean-up tool. After it has been used successfully, remove the endpoint in a follow-up patch.
