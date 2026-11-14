import { NextRequest } from 'next/server';
import { withPlatformRequest, platformJson } from '@/lib/platformRequest';
import { acceptInvitation } from '@/lib/platformStore';
import { isInviteToken, validOwnerPassword } from '@/lib/platformPolicy.mjs';
export const dynamic='force-dynamic';
export async function POST(request: NextRequest) {
  return withPlatformRequest(request,false,async()=>{
    const body=await request.json().catch(()=>null);
    if(!isInviteToken(body?.token)) return platformJson({error:'Open your original invitation link or request a replacement.'},400);
    if(!validOwnerPassword(body?.password)) return platformJson({error:'Choose a password of 14–128 characters.'},400);
    await acceptInvitation(body.token,body.password);
    return platformJson({ok:true});
  });
}
