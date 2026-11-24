import {NextRequest} from 'next/server';
import {withTenantRequest} from '@/lib/tenantRequest';
import {demoStartHostAllowed,demoJson,requireDemoOrigin,isRealDemoTenant,demoCookieOn,issueDemoToken} from '@/lib/publicDemoAuth';
import {verifyPublicDemoExtensionCode} from '@/lib/publicDemoAccess';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
  if(!demoStartHostAllowed(request))return demoJson({error:'Not found.'},404);
  return withTenantRequest(request,async()=>{
    if(!isRealDemoTenant())return demoJson({error:'The demo is not enabled.'},503);
    if(!requireDemoOrigin(request))return demoJson({error:'Request not permitted.'},403);
    const body=await request.json().catch(()=>null);
    try{
      const verified=await verifyPublicDemoExtensionCode(request,body?.code);
      if(!verified)return demoJson({error:'That code was not correct.'},400);
      const response=demoJson({ok:true,expiresInSeconds:1800});
      demoCookieOn(response,issueDemoToken());
      return response;
    }catch(e){return demoJson({error:e instanceof Error?e.message:'Could not verify the code.'},400);}
  });
}
