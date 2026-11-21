import { NextRequest, NextResponse } from 'next/server';
import { withTenantRequest } from '@/lib/tenantRequest';
import { currentTenant } from '@/lib/tenantScope.mjs';
import { getLogoVersion } from '@/lib/businessBranding';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return withTenantRequest(request, async () => {
    try {
      const tenant = currentTenant();
      const version = await getLogoVersion();
      return NextResponse.json({ name:tenant.name, hasLogo:Boolean(version), logoVersion:version },
        {headers:{'Cache-Control':'private, no-store, max-age=0'}});
    } catch {
      return NextResponse.json({error:'Business branding unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
    }
  });
}
