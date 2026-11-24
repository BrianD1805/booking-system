import {NextRequest} from 'next/server';
import {withTenantRequest} from '@/lib/tenantRequest';
import {createTemporaryDemoClient} from '@/lib/db';
import {demoStartHostAllowed,demoJson,requireDemoOrigin,isPublicDemoEnabled,isRealDemoTenant,demoRateCheck,verifyDemoChallenge,issueDemoToken,demoCookieOn} from '@/lib/publicDemoAuth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest) {
  if(!demoStartHostAllowed(request)) return demoJson({error:'Not found.'},404);
  return withTenantRequest(request, async()=>{
    if(!isPublicDemoEnabled() || !isRealDemoTenant()) return demoJson({error:'The full demo is not enabled yet.'},503);
    if(!requireDemoOrigin(request)) return demoJson({error:'Request not permitted.'},403);
    const body=await request.json().catch(()=>null);
    if(!body || typeof body!=='object' || typeof body.challenge!=='string') return demoJson({error:'Complete the security check.'},400);
    try {
      if(!await demoRateCheck(request)) return demoJson({error:'Demo sign-in limit reached. Please try again later.'},429);
      if(!await verifyDemoChallenge(request,body.challenge)) return demoJson({error:'The security check did not pass. Please try again.'},403);
      const demoCustomer=await createTemporaryDemoClient();
      const response=demoJson({ok:true,expiresInSeconds:900,clientSessionToken:demoCustomer.sessionToken});
      demoCookieOn(response,issueDemoToken());
      return response;
    } catch {return demoJson({error:'Demo access is temporarily unavailable.'},503);}
  });
}
