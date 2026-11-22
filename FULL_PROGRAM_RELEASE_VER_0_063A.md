# Booking System Ver-0.063A — Customer sign-up and business welcome UX

Prepared 22 November 2026. Full-source release based on Ver-0.063, not a partial patch.

## Corrections

- Public customer sign-up now collects required first name and surname (both client and server validation); the business account's customer row stores the full name instead of the `Client user` placeholder.
- A pending (unverified) SaaS signup for the same phone/email can update its own pending name. An old pending code that would result in an unnamed SaaS account is rejected with instructions to restart signup.
- The signup route checks for an existing customer **account** with the same email address in the same business and returns a clear error rather than failing on the unique account email index. Guest booking customer rows are not considered duplicate accounts.
- A guest booking still stores a guest customer row with the supplied contact details. Later registration with the same email is permitted if no *account* exists. The guest row and booking history are **not** automatically linked to a new account: this requires a future verified-ownership workflow and must not be implemented by matching phone/email alone.
- Country-code selector displays flags and dialling codes in a separate compact control, with a searchable portal menu that can open above the dialog; does not autofocus the search field. Existing ZipSelect visuals, arrow rotation, overlay positioning, keyboard Escape and click-outside handling are preserved.
- Booking home heading is smaller, uses the business name without the `ZipBook ` demo-registration prefix where applicable, and initially shows a neutral `Welcome` rather than flashing the generic product welcome.
- No unrelated changes to the approved /book design, Admin layouts, staff diary, booking engine or private tenant rules. No separate billing system: plans and payments remain on ZippyWeb.

## SQL status

**No additional Supabase SQL required.** `customers.full_name` and the existing per-business `client_accounts` unique-email index already support these changes. Existing Ver-0.063 Supabase migration must remain applied.

## Windows CMD — local tests (single block; no Netlify Dev)

```
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm audit --omit=dev && npm run typecheck && npm run build
```

## Windows CMD — deploy (separate)

```
git status && git add -A && git commit -m "Booking System Ver-0.063A Customer Signup and Welcome UX" && git push origin main
```

## Testing status

- All 99 Node regression tests passed in the build workspace with locally available TypeScript for the diary-preview test.
- Changed TypeScript/TSX files passed TypeScript syntax transpilation checks.
- `npm ci`, `npm audit`, full `tsc --noEmit`, full Next.js build, and live Supabase/Resend verification have **not** been completed in the build workspace. Verify on Windows and after Netlify publishes.

## Live acceptance checklist (repeat Ver-0.063 and UX tests)

1. Open `https://demo-dental.zipbook.app/book`. Confirm the smaller heading reads `Welcome to Demo Dental.` and the client logo, booking CTA and account icon have not moved.
2. Open Login / Sign up. In Sign up confirm First name and Surname are mandatory. Confirm Create account stays disabled until both names and all existing required fields are valid.
3. Open the phone country selector: flag + dial code, searchable list, no clipping behind dialog, no automatic mobile keyboard, closes normally. Check phone normalization with +44 and +254 values.
4. Create a new customer account using an unused mobile number and an accessible email address. Enter the verification code. Confirm My Account displays the **full actual name**.
5. Sign out and sign in again using that mobile and password.
6. Book a future appointment while signed in, confirm My Account lists it, the correct practice diary is updated, and the confirmation email is received.
7. Edit and then cancel the test appointment; confirm the diary and available slots update.
8. Test Forgot Password: verify the email code, reset the password, and sign back in.
9. Create a guest booking for a separate unused email/phone. Confirm it appears in the practice diary and customer list but does not create a login account. Now sign up using that email/phone and a full name; confirm registration succeeds but earlier **guest** booking is not automatically exposed in My Account. Make another booking while signed in and check only that new one appears.
10. Attempt another signup with an email already bound to a **verified login account** in the same business (different phone); confirm a clear sign-in/reset instruction instead of a generic SQL error.
11. Open James Plumbing. Confirm Demo Dental's customer session, name, history and appointments are inaccessible. Verify a separate customer account can be created under that business.
12. Confirm the public booking iframe, staff diary iframe, tenant logos and guest booking still work.

Test with controlled accounts and future appointments only. No production signups automatically grant access to historical guest records.
