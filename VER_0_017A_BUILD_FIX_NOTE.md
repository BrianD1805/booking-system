# ZipBook Ver-0.017A — Header TypeScript Build Fix

This patch fixes the TypeScript build error in `components/Header.tsx` where the non-client navigation branch still compared `area !== 'client'` even though TypeScript had already narrowed the type to `admin | landing`.

The impossible comparison was removed. The Client app navigation link still appears on admin/landing surfaces, and the client surface remains clean with only the client context pill.

No database or migration changes.
