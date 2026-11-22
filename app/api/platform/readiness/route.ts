import { NextRequest } from 'next/server';
import { withPlatformRequest, platformJson } from '@/lib/platformRequest';
import { getBusinessReadiness } from '@/lib/platformReadiness';

export const dynamic='force-dynamic';
export const runtime='nodejs';

export async function GET(request: NextRequest) {
  return withPlatformRequest(request,true,async()=>{
    const id=request.nextUrl.searchParams.get('id')||'';
    if(!/^practice-[0-9a-f-]{36}$/.test(id)) return platformJson({error:'Invalid business.'},400);
    return platformJson(await getBusinessReadiness(id));
  });
}
