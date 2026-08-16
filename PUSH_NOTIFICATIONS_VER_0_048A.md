# Build Ver-0.048A — Deploy Dependency Registry Fix

Ver-0.048A fixes the Netlify deploy failure found after Ver-0.048.

## What happened

Netlify failed during dependency installation while trying to fetch `@types/pg` from an internal OpenAI package gateway URL. That URL should never be present in the production lockfile and is not reachable from Netlify.

## Fix applied

- Replaced the bad `@types/pg` package-lock resolved URL with the public npm registry URL.
- Bumped visible app version to `Ver-0.048A`.
- Bumped service worker cache to `zipbook-v0.048A`.
- Bumped `package.json` to `0.0.48-a.0`.
- No application logic changed.
- No SQL required beyond the Ver-0.048 push notification SQL already provided.

## Notes

This was a deploy/install issue, not a Push Notification environment variable issue.
