import { NextRequest, NextResponse } from 'next/server';
import { withTenantRequest } from '@/lib/tenantRequest';
import { currentTenant } from '@/lib/tenantScope.mjs';
import { getLogoVersion } from '@/lib/businessBranding';
import { getCustomerTheme } from '@/lib/customerThemeStore';
import { businessManifest } from '@/lib/brandingPolicy.mjs';

export const dynamic = 'force-dynamic';
export async function GET(request:NextRequest) {
  return withTenantRequest(request, async () => {
    try {
      const tenant=currentTenant();
      const version=tenant.legacy ? null : await getLogoVersion();
      const manifest=businessManifest(tenant.legacy ? 'ZipBook' : tenant.name, tenant.legacy ? null : version);
      const theme=tenant.legacy ? null : await getCustomerTheme().catch(()=>null);
      if(theme){manifest.theme_color=theme.primary;manifest.background_color=theme.background;}
      return NextResponse.json(manifest,
        {headers:{'Content-Type':'application/manifest+json; charset=utf-8','Cache-Control':'private, no-store, max-age=0','Vary':'Host'}});
    } catch {
      return NextResponse.json({error:'App branding unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
    }
  });
}
