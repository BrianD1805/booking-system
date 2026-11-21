import { NextRequest, NextResponse } from 'next/server';
import { withTenantRequest } from '@/lib/tenantRequest';
import { currentTenant } from '@/lib/tenantScope.mjs';
import { getZipBookDatabase } from '@/lib/dbProvider';
import { frameAncestorsForDomains } from '@/lib/embedPolicy.mjs';

// Database reads deliberately live in a server API, never in proxy.ts.
// The tenant wrapper resolves the business from its hostname and applies RLS.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const deny = "frame-ancestors 'none'";
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
const json = (policy: string) => NextResponse.json({policy},{headers});
type EmbedDomain = { origin:string; public_embed_enabled:boolean; admin_embed_enabled:boolean };

export async function GET(request: NextRequest) {
  return withTenantRequest(request, async () => {
    const tenant = currentTenant();
    const kind = request.nextUrl.searchParams.get('kind');
    if (tenant.legacy || (kind !== 'public' && kind !== 'admin')) return json(deny);
    try {
      const database = getZipBookDatabase();
      const domains = await database.sql<EmbedDomain>`
        SELECT origin, public_embed_enabled, admin_embed_enabled
        FROM zipbook_embed_domains
        WHERE practice_id = ${tenant.practiceId}
        ORDER BY origin LIMIT 10`;
      return json(frameAncestorsForDomains(domains,kind));
    } catch {
      // Database errors or unapplied migrations must fail closed.
      console.error('ZipBook tenant embed-frame policy lookup failed.');
      return json(deny);
    }
  });
}
