import {NextRequest} from 'next/server';
import {withTenantRequest} from '@/lib/tenantRequest';
import {demoHostAllowed,demoJson,getDemoSession,isRealDemoTenant} from '@/lib/publicDemoAuth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest) {
  if(!demoHostAllowed(request)) return demoJson({error:'Not found.'},404);
  if(!request.cookies.get('zipbook_public_demo')) return demoJson({active:false},401);
  return withTenantRequest(request, async()=>{
    if(!isRealDemoTenant()) return demoJson({active:false,realDemo:false},404);
    const session=getDemoSession(request);
    return session ? demoJson({active:true,realDemo:true,expiresAt:session.expiresAt}) : demoJson({active:false,realDemo:true},401);
  });
}
