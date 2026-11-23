import {NextRequest} from 'next/server';
import {demoHostAllowed,demoJson,getDemoSession} from '@/lib/publicDemoAuth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest) {
  if(!demoHostAllowed(request)) return demoJson({error:'Not found.'},404);
  const session=getDemoSession(request);
  return session ? demoJson({active:true,expiresAt:session.expiresAt}) : demoJson({active:false},401);
}
