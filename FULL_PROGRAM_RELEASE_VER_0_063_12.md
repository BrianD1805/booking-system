# ZipBook Ver-0.063.12 — Demo branding and Home colours

Released 24 November 2026 (UK). Uses the supplied Demo Icon.png artwork unchanged except resizing for each icon size. Default shared ZipBook icons, favicon, Apple touch, PWA and browser-generated splash artwork refreshed. Legacy booking routes use the packaged identity; custom logos for non-legacy businesses remain supported. Shared fallback icons also appear on the Admin and marketing routes. Existing Home layout and booking controls are unchanged; corner accents are purple and blue, CTA #336699 and shadows light purple. No booking, authentication or database changes. No new Supabase SQL or Netlify variables. Browser-generated splash appearance depends on device; no existing custom splash component was found.

## Windows CMD tests

```cmd
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:version && npm run test:demo-reset && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm run test:demo-ux && npm run test:real-demo && npm run test:demo-time && npm run test:demo-repeat && npm run test:demo-isolation && npm run test:account-ux-patch10 && npm run test:practice-time && npm run test:demo-branding && npm audit --omit=dev && npm run typecheck && npm run build
```

## Separate Git deployment

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.12 Demo Branding and Home Colours" && git push origin main
```
