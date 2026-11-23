import {NextRequest} from 'next/server';
import {demoHostAllowed,demoJson,requireDemoOrigin,isPublicDemoEnabled,demoRateCheck,verifyDemoChallenge,issueDemoToken,demoCookieOn} from '@/lib/publicDemoAuth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest) {
  if(!demoHostAllowed(request)) return demoJson({error:'Not found.'},404);
  if(!isPublicDemoEnabled()) return demoJson({error:'The public demo is not enabled yet.'},503);
  if(!requireDemoOrigin(request)) return demoJson({error:'Request not permitted.'},403);
  const body=await request.json().catch(()=>null);
  if(!body || typeof body!=='object' || typeof body.challenge!=='string') return demoJson({error:'Complete the security check.'},400);
  try {
    if(!await demoRateCheck(request)) return demoJson({error:'Demo sign-in limit reached. Please try again later.'},429);
    if(!await verifyDemoChallenge(request,body.challenge)) return demoJson({error:'The security check did not pass. Please try again.'},403);
    const response=demoJson({ok:true,expiresInSeconds:900});
    demoCookieOn(response,issueDemoToken());
    return response;
  } catch {return demoJson({error:'Demo access is temporarily unavailable.'},503);}
}
