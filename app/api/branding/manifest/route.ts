import { NextRequest, NextResponse } from 'next/server';
import { withTenantRequest } from '@/lib/tenantRequest';
import { currentTenant } from '@/lib/tenantScope.mjs';
import { getLogoVersion } from '@/lib/businessBranding';
import { businessManifest } from '@/lib/brandingPolicy.mjs';

export const dynamic = 'force-dynamic';
export async function GET(request:NextRequest) {
  return withTenantRequest(request, async () => {
    try {
      const tenant=currentTenant();
      const version=tenant.legacy ? null : await getLogoVersion();
      return NextResponse.json(businessManifest(tenant.legacy ? 'ZipBook' : tenant.name, tenant.legacy ? null : version),
        {headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'private, no-store, max-age=0','Vary':'Host'}});
    } catch {
      return NextResponse.json({error:'App branding unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
    }
  });
}
