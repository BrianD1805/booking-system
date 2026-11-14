import { NextRequest, NextResponse } from 'next/server';
import { lookupTenant } from './dbProvider';
import { classifyTenantHost, runInTenant } from './tenantScope.mjs';
import { getDefaultPracticeId } from './tenant';

export async function withTenantRequest(request: NextRequest, work: () => Promise<Response>): Promise<Response> {
  // Never accept tenant IDs from request bodies, query strings or forwarded tenant headers.
  const host = classifyTenantHost(request.headers.get('host'), {
    enabled: process.env.ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS === '1',
    local: process.env.NODE_ENV !== 'production'
  });
  const headers = { 'Cache-Control': 'private, no-store, max-age=0' };
  if (host.kind === 'unknown') return NextResponse.json({ error:'Business not found.' }, {status:404,headers});
  let tenant;
  try {
    tenant = await lookupTenant(host.kind === 'legacy' ? getDefaultPracticeId() : null, host.kind === 'business' ? host.slug : null);
  } catch {
    console.error('ZipBook tenant lookup unavailable.');
    return NextResponse.json({error:'Business service is temporarily unavailable.'},{status:503,headers});
  }
  if (!tenant) return NextResponse.json({error:'Business not found or not active.'},{status:404,headers});
  if (host.kind === 'business') {
    const path = request.nextUrl.pathname;
    if (path.startsWith('/api/client-login/') || path === '/api/admin-data/bookings/past' || /^\/api\/admin-data\/customers\/[^/]+\/password$/.test(path)) {
      return NextResponse.json({error:'This feature is not enabled for pilot businesses.'},{status:403,headers});
    }
  }
  return runInTenant({ ...tenant, host:host.host, legacy:host.kind === 'legacy' }, work);
}
