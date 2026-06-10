# Ver-0.028D - Client PWA Load Repair

Purpose: repair client PWA load behaviour after recent patches.

Changes:
- Updated the service worker cache name to zipbook-v0.028D.
- Changed service-worker fetch handling so navigation requests use an HTML fallback only for pages.
- Stopped JavaScript/CSS/image requests from falling back to the cached home page HTML.
- This prevents an installed PWA from receiving HTML for a missing/stale JavaScript chunk, which can make the client app appear not to load.
- Kept the locked client-facing home page layout unchanged.

No database migration required.
