# ZipBook Ver-0.058B — Netlify Middleware / PostgreSQL Compatibility

**Incident:** Netlify `___netlify-edge-handler-node-middleware` failed loading a hashed `pg-*` external module from the Next.js 16 Turbopack middleware bundle, followed by `nextHandler is not a function`.

## Fix
- The middleware entrypoint (`proxy.ts`) no longer imports PostgreSQL or the database provider.
- A tenant-scoped, Node.js API `/api/embed-frame-policy` handles approved-domain lookup under the existing runtime database role and RLS.
- Proxy fetches the policy over the business host's own HTTPS origin; only a validated exact-origin policy is accepted. Failures and invalid responses return `frame-ancestors 'none'`.
- Public booking and staff diary embedding remain distinct and require a business owner's approval.
- No Supabase SQL changes from Ver-0.058A; Ver-0.058 schema still required.

## Important validation
Run all npm tests, `npm run typecheck`, `npm run build`, `npm audit --omit=dev` before deployment. Confirm Netlify runtime works on live `/`, `/admin`, `/book`, and business subdomain, then test permitted and forbidden website framing.

**Installation:** Use the versioned source overlay ZIP on top of the existing audited Ver-0.058A working directory. It intentionally does not replace package.json or package-lock.json because they were updated and audited on the Windows laptop. Run `npm version 0.0.58-b --no-git-tag-version` after applying this overlay, then npm ci, tests, audit, typecheck and build. Do not extract the previous full ZIP over this release or restore vulnerable Next.js 16.2.6. This is a source-only emergency compatibility patch, not a standalone full-source ZIP.

## TypeScript compatibility correction (Ver-0.058B)
- Added `lib/tenantHost.d.mts` to provide explicit type declarations for the new Edge-safe hostname helper.
- Added `safeRemoteFramePolicy` to `lib/embedPolicy.d.mts` so TypeScript can resolve its existing JavaScript implementation.
- Regression test checks declaration parity for both middleware imports.
- No changes to Next.js, `package.json`, `package-lock.json`, environment variables or the Supabase schema.
