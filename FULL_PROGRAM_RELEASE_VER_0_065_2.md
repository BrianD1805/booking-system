# ZipBook Ver-0.065.2 — Website Embed UX Refinements

Baseline: Ver-0.065.1. Changes apply to the public customer embed and generated integration snippets only. Standalone booking, PWA, staff diary, platform, tenant auth and database unchanged.

- Accumulate forwarded wheel deltas and ease them over animation frames, with direction cancellation, nested host scroll handoff and reduced-motion fallback. Avoid repeated viewport CSS updates when values have not changed. Native scrolling in genuine child scroll areas is retained. Real browser verification required.
- After the authorised embed handshake, show a compact, transparent booking entry with no duplicated logo, header or version badge; retain Make a booking and Login / Sign up / My account plus existing notices. Standalone home unchanged.
- Both generated public snippets show a horizontally centred accessible host-side loader immediately. Dismiss after verified height report with contentReady=true (initial bootstrap and tenant context settled, including errors). After 25 seconds show a non-blocking slow-connection message and the direct-link fallback. Reduced-motion support. Existing old snippets remain protocol-compatible but do not gain loader or smooth scrolling until replaced.
- No SQL or environment changes. Publish ZipBook, then copy the entire new React/Next.js component or HTML snippet into the host website and redeploy it. Verify desktop wheel and trackpad, touch, mobile layout, all booking steps, login and fallback.

Windows test: `npm ci && npm run test:all && npm audit --omit=dev && npm run typecheck && npm run build`
