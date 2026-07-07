# ZipBook Ver-0.040 — Client New Account/Login Popup

Ver-0.040 repairs the client login/sign-up popup layout without changing the locked client home page.

## Changes

- Fixed login/sign-up popup spacing and internal padding.
- Repaired input field border/padding behaviour so fields do not show heavy black outlines or clipped edges.
- Combined country code and mobile number into one mobile-number control group.
- Replaced the unreliable country datalist selector with a normal country-code dropdown.
- Put email address and password on the same row on desktop sign-up.
- Kept email address and password stacked on mobile.
- Replaced the old mobile-number OTP wording with email verification wording.
- Updated sign-up verification text to refer to the email address.

## Version alignment

- Visible app version: Ver-0.040
- Service worker cache: zipbook-v0.040
- package.json: 0.0.40

## SQL

No SQL migration is required for Ver-0.040.
