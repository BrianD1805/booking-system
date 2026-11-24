# ZipBook Ver-0.063.10 — Customer Home First and Account Sign-up Feedback

Release date: 24 November 2026 (UK).

## Scope and behaviour

- Demo visitors now open the **real Customer App Home page** (`/book`) in a new tab. No account modal or query-parameter deep link opens automatically. Visitors can make a **guest booking** or choose **Login / Sign up** themselves. The existing 30-minute signed demo session and real connected Practice Diary are retained.
- Remove the redundant **End demo and open normal booking** action from the Customer App. The separate `/demo` page retains its own End demo session action.
- On **all business tenant booking applications**, Create Account now shows a clear, centred **Creating your account…** spinner/progress popup while checking details and emailing an OTP. The Create Account button is no longer silently unresponsive for incomplete fields; tapping it explains what needs completing.
- If the server returns **an existing email or mobile number**, a failed OTP email delivery, rate-limit response, or another error, display a prominent accessible **Account not created yet** popup with the precise returned message, an OK button, and a Login action for appropriate duplicate-account responses. Errors are not hidden at the bottom of the scrollable account form.
- Only advance to the verification-code form after a successful code request with confirmed email delivery (or permitted local/test-mode preview). Keep all existing server-side rate limits, tenant checks, password policy, and OTP verification.
- Preserve Home page appearance, approved popup layout, customer/guest flows, staff diary, and existing demo security restrictions.

## Testing and deployment

- New regression suite `npm run test:account-ux-patch10`, included in the combined full test command. Existing tests expecting forced automatic sign-up updated to reflect the new explicit Home-first requirement.
- No new Supabase schema migration or Netlify environment variables are required.
- Run automated tests, `npm audit --omit=dev`, `npm run typecheck`, and `npm run build` locally. Verify live demo guest bookings, normal tenant sign-up and duplicate-email/phone feedback before announcing the release.
- Update `package.json`, `package-lock.json`, `lib/domains.ts`, `public/sw.js`, README and current release notes to **Ver-0.063.10**.
