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
      // The normal customer account experience is available ONLY inside an
      // active, signed public demo session. Unrelated OTP and push APIs remain closed.
      const allowedCustomerPath = [
        '/api/client-login/session','/api/client-login/logout','/api/client-login/login',
        '/api/client-login/sign-up/request-code','/api/client-login/sign-up/verify',
        '/api/client-login/bookings','/api/client-login/password-reset/request-code',
        '/api/client-login/password-reset/confirm'
      ].includes(path) || /^\/api\/client-login\/bookings\/[^/]+$/.test(path);
      if(path.startsWith('/api/client-login/') && !allowedCustomerPath)
        return NextResponse.json({error:'This account feature is not available in the public demo.'},{status:403,headers});
      if(path.startsWith('/api/client-login/') && path!=='/api/client-login/logout' && !getDemoSession(request))
        return NextResponse.json({error:'The 30-minute demo has ended. Start another verified demo session.'},{status:401,headers});
      // All public demo writes, including customer-side edits, need a verified
      // temporary visitor session and shared, database-backed action budget.
      const demoWrite=(path==='/api/bookings' && method==='POST') ||
        (/^\/api\/bookings\/[^/]+$/.test(path) && ['PATCH','DELETE'].includes(method)) ||
        (/^\/api\/client-login\/bookings\/[^/]+$/.test(path) && ['PATCH','DELETE'].includes(method)) ||
        (path.startsWith('/api/client-login/') && method==='POST' && path!=='/api/client-login/logout');
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
