import {NextRequest} from 'next/server';
import {withTenantRequest} from '@/lib/tenantRequest';
import {demoStartHostAllowed,demoJson,requireDemoOrigin,isRealDemoTenant} from '@/lib/publicDemoAuth';
import {requestPublicDemoExtensionCode} from '@/lib/publicDemoAccess';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
  if(!demoStartHostAllowed(request))return demoJson({error:'Not found.'},404);
  return withTenantRequest(request,async()=>{
    if(!isRealDemoTenant())return demoJson({error:'The demo is not enabled.'},503);
    if(!requireDemoOrigin(request))return demoJson({error:'Request not permitted.'},403);
    const body=await request.json().catch(()=>null);
    if(!body||body.consent!==true)return demoJson({error:'Please acknowledge how your details will be used for demo verification.'},400);
    try{return demoJson({ok:true,...await requestPublicDemoExtensionCode(request,body)});}
    catch(e){return demoJson({error:e instanceof Error?e.message:'Could not send your verification email.'},400);}
  });
}
