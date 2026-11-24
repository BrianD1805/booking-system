import {NextRequest} from 'next/server';
import {demoHostAllowed,demoJson,isPublicDemoEnabled,realDemoConfigured,demoStartHostAllowed,publicDemoSiteKey} from '@/lib/publicDemoAuth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest) {
  if(!demoStartHostAllowed(request)) return demoJson({error:'Not found.'},404);
  return demoJson({enabled:isPublicDemoEnabled() && realDemoConfigured(),siteKey:publicDemoSiteKey()});
}
