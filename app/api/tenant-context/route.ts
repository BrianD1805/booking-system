import { NextRequest, NextResponse } from 'next/server';
import { withTenantRequest } from '@/lib/tenantRequest';
import { currentTenant } from '@/lib/tenantScope.mjs';
import { APP_VERSION } from '@/lib/domains';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return withTenantRequest(request, async () => {
    const tenant = currentTenant();
    return NextResponse.json({ ok:true, version:APP_VERSION, tenant:{ tenantSlug:tenant.tenantSlug, name:tenant.name, legacy:tenant.legacy, publicBookings:tenant.publicBookings !== false } },{headers:{'Cache-Control':'private, no-store, max-age=0'}});
  });
}
