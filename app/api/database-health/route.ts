import { NextResponse, type NextRequest } from 'next/server';
import { withTenantRequest } from '@/lib/tenantRequest';
import { getZipBookDatabase } from '@/lib/dbProvider';
import { requireAdminStaff } from '@/lib/adminStaffAuth';
import { APP_VERSION } from '@/lib/domains';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  return withTenantRequest(request, async () => {
    const headers = {'Cache-Control':'private, no-store, max-age=0'};
    const smoke = request.nextUrl.searchParams.get('smoke') === '1';
    if (smoke) { try { await requireAdminStaff(request); } catch { return NextResponse.json({error:'Staff login required.'},{status:401,headers}); } }
    try {
      const db=getZipBookDatabase();
      await db.sql`SELECT id FROM practices LIMIT 1`;
      if (smoke) await Promise.all([db.sql`SELECT id FROM bookings LIMIT 1`,db.sql`SELECT id FROM customers LIMIT 1`,db.sql`SELECT id FROM admin_staff_members LIMIT 1`,db.sql`SELECT id FROM practitioners LIMIT 1`,db.sql`SELECT id FROM client_accounts LIMIT 1`]);
      return NextResponse.json({ok:true,version:APP_VERSION,provider:'supabase',...(smoke?{smoke:{ok:true}}:{})},{headers});
    } catch {return NextResponse.json({ok:false,version:APP_VERSION,error:'Database health check failed.'},{status:503,headers});}
  });
}
