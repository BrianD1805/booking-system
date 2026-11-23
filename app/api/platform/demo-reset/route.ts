import {NextRequest} from 'next/server';
import {withPlatformRequest,platformJson} from '@/lib/platformRequest';
import {listDemoTargets,demoProfile,saveDemoDefaults,resetDemoData} from '@/lib/platformDemoReset';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:NextRequest){
  return withPlatformRequest(request,true,async()=>{
    const id=request.nextUrl.searchParams.get('id')||'';
    return platformJson({targets:await listDemoTargets(),profile:id?await demoProfile(id):null});
  });
}
export async function POST(request:NextRequest){
  return withPlatformRequest(request,true,async()=>{
    const body=await request.json().catch(()=>null);
    if(!body || typeof body!=='object' || Array.isArray(body) || typeof body.id!=='string') return platformJson({error:'Invalid demo reset request.'},400);
    if(body.action==='save') return platformJson({ok:true,...await saveDemoDefaults(body.id,body.settings)});
    if(body.action==='reset') return platformJson({ok:true,...await resetDemoData(body.id,body.confirmation,body.acknowledged)});
    return platformJson({error:'Unknown demo reset action.'},400);
  });
}
