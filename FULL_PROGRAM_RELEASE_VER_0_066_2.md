# ZipBook Ver-0.066.2 — Website Installation, FAQs and Social Sharing

- New public `/installation` page uses the existing Inter marketing design and includes chronological setup, direct-link, HTML, React/Next.js and testing instructions, copyable examples and FAQs. Examples use a placeholder business subdomain; personalised code remains in the existing authorised Practice Diary.
- Retired `/widget` page; permanent redirect to `/installation` for old bookmarks. Updated navigation and public service-worker route/cache version. No new login entry points.
- `public/og-image.png` is byte-identical to the original 1254 × 1254 blue master logo; root Open Graph and Twitter metadata refer to the updated asset with a versioned URL. No resizing or cropping. Social platform previews may crop or cache independently.
- Booking, iframe runtime, protected UI, diary and Platform behaviour remain unchanged. No SQL or new environment variables.
- Local checks: `npm ci && npm run test:all && npm audit --omit=dev && npm run typecheck && npm run build`.
