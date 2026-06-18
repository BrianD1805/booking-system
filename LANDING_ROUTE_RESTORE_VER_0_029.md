# Ver-0.029 — Restore ZipBook Landing Route

This patch restores the intended route split:

- `/` remains the public ZipBook landing page on `zipbook.app`.
- `/book` remains the client booking PWA.
- `/admin` remains the admin diary on local/dev and is the target for the admin subdomain rewrite.

Changes made:

- Removed the client-domain root rewrite that sent `/` to `/book`.
- Kept admin subdomain root rewriting to `/admin`.
- Restricted the client PWA manifest scope to `/book`.
- Updated the service worker cache to `zipbook-v0.029` and made offline navigation prefer the landing page before falling back to `/book`.
- Bumped visible version references to Ver-0.029.

No database migration is required.

The locked client booking home at `/book` was not altered.
