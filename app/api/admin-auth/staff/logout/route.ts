import { NextRequest, NextResponse } from 'next/server';
import { withTenantRequest } from '@/lib/tenantRequest';
import { readStaffToken, requireAdminStaff } from '@/lib/adminStaffAuth';
import { revokeAdminStaffSession } from '@/lib/db';
import {getDemoSession,isRealDemoTenant,demoCookieOff,requireDemoWriteOrigin} from '@/lib/publicDemoAuth';
export const dynamic='force-dynamic';
export async function POST(request: NextRequest) {
  return withTenantRequest(request,async()=>{
    if(isRealDemoTenant() && getDemoSession(request) && !readStaffToken(request)) {
      if(!requireDemoWriteOrigin(request)) return NextResponse.json({error:'Invalid demo sign-out request.'},{status:403});
      const response=NextResponse.json({ok:true});demoCookieOff(response);return response;
    }
    try {await requireAdminStaff(request); await revokeAdminStaffSession(readStaffToken(request));}
    catch { return NextResponse.json({error:'Could not revoke this session.'},{status:401}); }
    const response=NextResponse.json({ok:true});
    response.cookies.set('zipbook_staff_token','',{path:'/admin',maxAge:0});
    return response;
  });
}
