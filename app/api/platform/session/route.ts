import { NextRequest } from 'next/server';
import { withPlatformRequest, platformJson } from '@/lib/platformRequest';
import { platformKeyMatches } from '@/lib/platformPolicy.mjs';
import { issuePlatformSession, platformSessionExpiry, PLATFORM_SESSION_COOKIE, PLATFORM_SESSION_SECONDS } from '@/lib/platformSession.mjs';
export const dynamic = 'force-dynamic';
const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/platform' };
export async function GET(request: NextRequest) {
  return withPlatformRequest(request,false,async()=>{
    const expiresAt = platformSessionExpiry(process.env.ZIPBOOK_PLATFORM_ADMIN_KEY,request.cookies.get(PLATFORM_SESSION_COOKIE)?.value);
    return expiresAt ? platformJson({expiresAt}) : platformJson({error:'Platform sign-in is required.'},401);
  });
}
export async function POST(request: NextRequest) {
  return withPlatformRequest(request,false,async()=>{
    const body = await request.json().catch(()=>null);
    if (body?.action === 'logout') { const response=platformJson({ok:true}); response.cookies.set(PLATFORM_SESSION_COOKIE,'',{...options,maxAge:0}); return response; }
    if (body?.action !== 'login' || !platformKeyMatches(process.env.ZIPBOOK_PLATFORM_ADMIN_KEY,body.key)) return platformJson({error:'Invalid platform access key.'},401);
    const {token,expiresAt}=issuePlatformSession(process.env.ZIPBOOK_PLATFORM_ADMIN_KEY);
    const response=platformJson({expiresAt}); response.cookies.set(PLATFORM_SESSION_COOKIE,token,{...options,maxAge:PLATFORM_SESSION_SECONDS}); return response;
  });
}
