## Ver-0.065 — Customer App Branding
Apply `supabase/zipbook_customer_theme_ver_0_065.sql` before deploy. Business owners can customise booking colours and fonts in Admin Settings.

# ZipBook Ver-0.064 — Business Onboarding & Staff Account Recovery

Apply `supabase/zipbook_staff_recovery_ver_0_064.sql` before deployment. See `FULL_PROGRAM_RELEASE_VER_0_064.md` for configuration and release notes.

```cmd
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:version && npm run test:demo-reset && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm run test:demo-ux && npm run test:real-demo && npm run test:demo-time && npm run test:demo-repeat && npm run test:demo-isolation && npm run test:account-ux-patch10 && npm run test:practice-time && npm run test:demo-branding && npm run test:booking-popup-ux && npm run test:booking-refinements && npm run test:platform-session-reset && npm run test:blue-branding && npm run test:staff-recovery && npm audit --omit=dev && npm run typecheck && npm run build
```

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.064 Business Onboarding and Staff Account Recovery" && git push origin main
```

## Previous release reference

# ZipBook Ver-0.063.16 — Blue branding and field borders

25 November 2026. Global default blue icon, blue corner accents and scrollbar, secondary outlined actions, thicker input borders. Existing business logos remain intact. No SQL or environment changes.

## Windows CMD tests

```cmd
npm ci && npm run test:heartbeat && npm run test:booking-time && npm run test:scheduling && npm run test:saas && npm run test:tenants && npm run test:onboarding && npm run test:integration && npm run test:branding && npm run test:readiness && npm run test:procedure-ux && npm run test:diary-slots && npm run test:public-booking && npm run test:customer-accounts && npm run test:account-ux && npm run test:client-login-typecheck && npm run test:version && npm run test:demo-reset && npm run test:country-ux && npm run test:account-ux-patch && npm run test:account-ux-patch3 && npm run test:demo-ux && npm run test:real-demo && npm run test:demo-time && npm run test:demo-repeat && npm run test:demo-isolation && npm run test:account-ux-patch10 && npm run test:practice-time && npm run test:demo-branding && npm run test:booking-popup-ux && npm run test:booking-refinements && npm run test:platform-session-reset && npm run test:blue-branding && npm audit --omit=dev && npm run typecheck && npm run build
```

## Separate Git deployment

```cmd
git status && git add -A && git commit -m "ZipBook Ver-0.063.16 Blue Branding and Input Borders" && git push origin main
```

Previous release: `FULL_PROGRAM_RELEASE_VER_0_063_15.md`.
