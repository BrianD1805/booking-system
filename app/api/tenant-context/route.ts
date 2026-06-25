import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/tenant';
import { APP_VERSION } from '@/lib/domains';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const context = resolveTenantContext({
    host: request.headers.get('host'),
    pathname: request.nextUrl.pathname
  });
  const diagnostic = request.nextUrl.searchParams.get('diagnostic') === '1';

  const response = NextResponse.json({
    ok: true,
    version: APP_VERSION,
    tenant: context,
    ...(diagnostic
      ? { note: 'SaaS tenant resolver foundation. This diagnostic endpoint is deliberately DB-free and no-store to avoid waking Netlify Database.' }
      : {})
  });

  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
