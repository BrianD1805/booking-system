import { currentTenant } from '@/lib/tenantScope.mjs';
import { withTenantRequest } from '@/lib/tenantRequest';
import { NextRequest, NextResponse } from 'next/server';
import { getBootstrapData } from '@/lib/db';
import { requireAdminStaff } from '@/lib/adminStaffAuth';
import { publicBootstrap } from '@/lib/publicAvailability.mjs';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET(request: NextRequest) {
  return withTenantRequest(request, async () => {
  const adminView = request.nextUrl.searchParams.get('view') === 'admin';
  if (!adminView && currentTenant().publicBookings === false) return NextResponse.json({error:'Online bookings are not open yet.'},{status:403,headers:noStore});
  if (adminView) {
    try { await requireAdminStaff(request); }
    catch { return NextResponse.json({ error: 'Staff login is required.' }, { status: 401, headers: noStore }); }
  }
  try {
    const data = await getBootstrapData();
    return NextResponse.json(adminView ? data : publicBootstrap(data), { headers: noStore });
  } catch {
    console.error('ZipBook bootstrap lookup failed');
    return NextResponse.json({ error: 'Could not load booking settings.' }, { status: 500, headers: noStore });
  }
  });
}
