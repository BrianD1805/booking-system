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
      ? { note: 'Single-practice runtime. Additional business accounts are not enabled.' }
      : {})
  });

  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
