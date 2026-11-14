import { NextRequest, NextResponse } from 'next/server';
import { withTenantRequest } from '@/lib/tenantRequest';
import { readStaffToken, requireAdminStaff } from '@/lib/adminStaffAuth';
import { revokeAdminStaffSession } from '@/lib/db';
export const dynamic='force-dynamic';
export async function POST(request: NextRequest) {
  return withTenantRequest(request,async()=>{
    try {await requireAdminStaff(request); await revokeAdminStaffSession(readStaffToken(request));}
    catch { return NextResponse.json({error:'Could not revoke this session.'},{status:401}); }
    const response=NextResponse.json({ok:true});
    response.cookies.set('zipbook_staff_token','',{path:'/admin',maxAge:0});
    return response;
  });
}
