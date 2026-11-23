import {NextRequest} from 'next/server';
import {demoHostAllowed,demoJson,requireDemoOrigin,demoCookieOff} from '@/lib/publicDemoAuth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest) {
  if(!demoHostAllowed(request)) return demoJson({error:'Not found.'},404);
  if(!requireDemoOrigin(request)) return demoJson({error:'Request not permitted.'},403);
  const response=demoJson({ok:true});
  demoCookieOff(response);
  return response;
}
