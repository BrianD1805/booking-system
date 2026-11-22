import { withTenantRequest } from '@/lib/tenantRequest';
import { NextRequest, NextResponse } from 'next/server';
import { getClientProfileBySession } from '@/lib/db';
import { currentTenant } from '@/lib/tenantScope.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return withTenantRequest(request, async () => {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';
    // Query-string tokens can leak via URLs, referrers and logs. Keep this
    // older compatibility path for the original app only, not SaaS tenants.
    const queryToken = currentTenant().legacy ? request.nextUrl.searchParams.get('token') ?? '' : '';
    const profile = await getClientProfileBySession(bearerToken || queryToken);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Client session not available.'
    }, { status: 401 });
  }
  });
}
