import {NextRequest} from 'next/server';
import {withTenantRequest} from '@/lib/tenantRequest';
import {demoStartHostAllowed,demoJson,requireDemoOrigin,isPublicDemoEnabled,isRealDemoTenant,demoRateCheck,verifyDemoChallenge,issueDemoToken,demoCookieOn,getDemoSession} from '@/lib/publicDemoAuth';
import {beginPublicDemoVisit} from '@/lib/publicDemoAccess';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest) {
  if(!demoStartHostAllowed(request))return demoJson({error:'Not found.'},404);
  return withTenantRequest(request,async()=>{
    if(!isPublicDemoEnabled()||!isRealDemoTenant())return demoJson({error:'The full demo is not enabled yet.'},503);
    if(!requireDemoOrigin(request))return demoJson({error:'Request not permitted.'},403);
    const active=getDemoSession(request);
    if(active)return demoJson({ok:true,expiresAt:active.expiresAt,alreadyActive:true});
    const body=await request.json().catch(()=>null);
    if(!body||typeof body!=='object'||typeof body.challenge!=='string')return demoJson({error:'Complete the security check.'},400);
    try {
      if(!await demoRateCheck(request))return demoJson({error:'Too many demo requests. Please try again later.'},429);
      if(!await verifyDemoChallenge(request,body.challenge))return demoJson({error:'The security check did not pass.'},403);
      const result=await beginPublicDemoVisit(request);
      if(result==='verify-email')return demoJson({requiresVerification:true,message:'For another 30-minute demo, verify your contact details by email.'},409);
      const response=demoJson({ok:true,expiresInSeconds:1800});
      demoCookieOn(response,issueDemoToken());
      return response;
    }catch(error){return demoJson({error:error instanceof Error?error.message:'Demo access is temporarily unavailable.'},429);}
  });
}
