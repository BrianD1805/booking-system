# ZipBook Is a ZippyWeb Product — Central Billing Plan

**Decision taken 22 November 2026. Not implemented in Ver-0.061A.**

ZippyWeb (zippyweb.uk) handles all payment collection and subscription billing for ZipBook. Do **not** add ZipBook-specific Stripe checkout, subscription renewal billing, invoicing or customer payment-method management into the ZipBook app.

Proposed workflow:

1. Unlisted product/service and plan page on ZippyWeb with plan features and terms. "Unlisted" means not advertised in menus, **not** an access-control mechanism.
2. ZippyWeb handles all pricing, Stripe Checkout/Customer Portal, payment methods, renewals, cancellations, invoices, receipts, taxes/consumer disclosures and refunds according to its own legal configuration.
3. Once ZippyWeb verifies payment server-side through authenticated Stripe events, issue a single-use, short-lived onboarding grant bound to the purchaser and plan. Prevent forged/guessed grants, token reuse and arbitrary cross-tenant enrolment.
4. ZipBook verifies a backend-issued grant before allowing a paid business onboarding path; provision its tenant, Owner invitation, app permissions and branding in its own database. Do not transmit payment card details to ZipBook.
5. Maintain a secure ZippyWeb↔ZipBook account mapping and entitlement status. ZippyWeb webhooks/entitlement notifications must use strong authentication, replay protection and idempotent processing. Plan changes, grace periods and cancellation decisions should be reflected in ZipBook access without losing customer booking data.
6. Platform Administration remains available for necessary owner/operator actions and controlled pilots but is not a replacement for verified billing entitlement.

Implementation requires both current full programme ZIPs, a secure integration design, database/schema versioning as needed, testing of event ordering, cancellations, failed payments, duplicate events and data isolation, and a planned cutover. Do not implement without the ZippyWeb programme available and a specific build request.
