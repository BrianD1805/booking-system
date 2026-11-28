# ZipBook Ver-0.065.4 — Platform Business Information UX

Based on Ver-0.065.3. Business links and onboarding progress use a native disclosure closed by default. Expanded details are grouped in chronological onboarding stages: invitation and owner verification, Practice Diary activation, business setup and readiness, public booking activation. Practitioner and service counts are moved inside the setup section. Diary and booking URLs remain permanent, clickable, underlined and open safely in a new tab. Email delivery statuses and existing resend/refresh conditions remain intact, as do the main business actions. No database, API, customer app or website integration changes. No new SQL or environment variables.

Windows test: `npm ci && npm run test:all && npm audit --omit=dev && npm run typecheck && npm run build`

Deploy after tests pass: `git status && git add -A && git commit -m "ZipBook Ver-0.065.4 Platform Business Information UX" && git push origin main`

Verification: 220/220 automated tests passed (four added source regression tests) using globally installed TypeScript for the existing diary preview test. Changed Platform TSX transpilation reported zero diagnostics. Offline npm ci was blocked by uncached xtend 4.0.2; full dependency installation, typecheck, audit, production build and live visual testing remain outstanding.
