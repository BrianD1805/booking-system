# ZipBook Ver-0.040 — Logo and Theme Refresh

Ver-0.040 applies the uploaded ZipBook logo throughout the app and refreshes the global theme colour.

## Changes

- Replaced favicon, app icons, Apple touch icon, maskable icons, and Open Graph image using the uploaded ZipBook logo artwork.
- Updated PWA manifest theme colours for client and admin.
- Updated browser/mobile theme colours to `#336699`.
- Updated global primary blue styling to `#336699` across the landing page, client app, admin diary, and shared UI controls.
- Replaced the old orange/amber accent/shadow styling with green accent styling where it appeared.
- Bumped visible app version to `Ver-0.040`.
- Bumped service worker cache to `zipbook-v0.040`.
- Bumped package version to `0.0.40`.

## SQL

No SQL migration is required for Ver-0.040.

## Testing

After deployment, hard refresh or clear the PWA/browser cache if an old favicon or app icon still appears briefly. Service worker cache has been bumped, but installed PWAs and browsers may keep icon assets aggressively cached.
