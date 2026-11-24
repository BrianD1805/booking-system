import { NextRequest, NextResponse } from 'next/server';
import { lookupTenant } from './dbProvider';
import { classifyTenantHost, runInTenant } from './tenantScope.mjs';
import { getDefaultPracticeId } from './tenant';
import {isRealDemoTenant,getDemoSession,requireDemoWriteOrigin,demoActionRateCheck} from './publicDemoAuth';

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
    if (path === '/api/client-login/request-code' || path === '/api/client-login/verify' || path === '/api/admin-data/bookings/past' || /^\/api\/admin-data\/customers\/[^/]+\/password$/.test(path)) {
      return NextResponse.json({error:'This feature is not enabled for pilot businesses.'},{status:403,headers});
    }
  }
  return runInTenant({ ...tenant, host:host.host, legacy:host.kind === 'legacy' }, async () => {
    if(isRealDemoTenant()) {
      const path=request.nextUrl.pathname;
      const method=request.method.toUpperCase();
      if(path==='/api/client-login/session' && !getDemoSession(request))
        return NextResponse.json({error:'The public demo session has ended. Please start a new demo.'},{status:401,headers});
      if(path.startsWith('/api/client-login/') &&
        !['/api/client-login/session','/api/client-login/logout'].includes(path) &&
        !/^\/api\/client-login\/bookings\/[^/]+$/.test(path)) {
        return NextResponse.json({error:'Public demo visitors receive an automatic temporary customer account. No email or password is needed.'},{status:403,headers});
      }
      // All public demo writes, including customer-side edits, need a verified
      // temporary visitor session and shared, database-backed action budget.
      const demoWrite=(path==='/api/bookings' && method==='POST') ||
        (/^\/api\/bookings\/[^/]+$/.test(path) && ['PATCH','DELETE'].includes(method)) ||
        (/^\/api\/client-login\/bookings\/[^/]+$/.test(path) && ['PATCH','DELETE'].includes(method));
      if(demoWrite && (!getDemoSession(request)||!requireDemoWriteOrigin(request)))
        return NextResponse.json({error:'Open the public demo first to start a protected session.'},{status:403,headers});
      if(demoWrite) {
        try {
          if(!await demoActionRateCheck(request)) return NextResponse.json({error:'Your demo action limit was reached. Please start a new demo later.'},{status:429,headers});
        } catch {return NextResponse.json({error:'Demo security check unavailable.'},{status:503,headers});}
      }
    }
    return work();
  });
}
