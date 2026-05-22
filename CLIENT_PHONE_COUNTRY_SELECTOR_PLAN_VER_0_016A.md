# ZipBook Ver-0.016A — Client Phone Country Selector and Normalisation

This patch tightens the client OTP login phone model.

## What changed

- Client login now asks for a searchable country selection before entering the mobile number.
- Clients can type the local mobile number, for example `0712345678`.
- ZipBook removes leading zeroes from local numbers and stores the full international number, for example `+254712345678`.
- If the client types the full international number with `+`, ZipBook accepts it as-is after cleaning spaces and punctuation.
- The full international mobile number remains the unique client account identifier in `client_accounts.login_phone`.
- Email remains the first OTP delivery channel until SMS delivery is wired.

## Future SaaS note

The country list is currently a practical global list with the target markets near the top. Later, each practice/tenant should have a default country setting so the correct country appears first for that practice.
