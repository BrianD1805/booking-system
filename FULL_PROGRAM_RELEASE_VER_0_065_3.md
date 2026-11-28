# ZipBook Ver-0.065.3 — Customer Branding Restrictions & Protected UI

Based on Ver-0.065.2. Only five colours (primary, secondary, topRight, bottomLeft, background) and an approved font may be saved. Logo upload is unchanged. Protected values from legacy records are ignored; invalid or incompatible allowed values fall back individually. A dark Home background incompatible with fixed text is replaced by the default. A later explicit save stores only the allowed fields. No new SQL or environment variables; the Ver-0.065 migration remains required.

Shared CSS variables are no longer overridden by business themes. Calendar, time picker, dropdowns, input borders, popup backgrounds, scrollbar, semantic alerts, cancellation, feedback and booking success retain the standard styles. Ordinary action buttons and Home decoration may be customised. Embed protocol and snippets are unchanged; standalone design, staff diary, Platform and legacy demo retain their scope. No host website changes required.

Windows test: `npm ci && npm run test:all && npm audit --omit=dev && npm run typecheck && npm run build`

Deploy after tests pass: `git status && git add -A && git commit -m "ZipBook Ver-0.065.3 Customer Branding Restrictions" && git push origin main`

Verification: 216/216 Node tests passed using the environment’s globally installed TypeScript for the diary preview suite. Changed TypeScript syntax checks passed. Isolated Chromium fixture using actual global, customer and embed CSS verified unchanged calendar/time controls, dropdowns, cancellation and alerts; white booking canvas, 2px input borders, custom ordinary action colours, Home background and corner effects, and transparent embedded mode. This is not a live Next.js or Supabase integration test. Offline npm ci failed because xtend 4.0.2 was absent from the cache; full typecheck, audit and production build must run locally.
