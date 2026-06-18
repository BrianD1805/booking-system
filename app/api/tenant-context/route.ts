import { NextRequest, NextResponse } from 'next/server';
import { resolveTenantContext } from '@/lib/tenant';
import { APP_VERSION } from '@/lib/domains';

export async function GET(request: NextRequest) {
  const context = resolveTenantContext({
    host: request.headers.get('host'),
    pathname: request.nextUrl.pathname
  });

  return NextResponse.json({
    ok: true,
    version: APP_VERSION,
    tenant: context,
    note: 'SaaS tenant resolver foundation. Current demo routes still resolve to the default practice until tenant-specific onboarding is added.'
  });
}
