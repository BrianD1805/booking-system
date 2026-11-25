import { NextRequest,NextResponse } from 'next/server';
import { withTenantRequest } from '@/lib/tenantRequest';
import { currentTenant } from '@/lib/tenantScope.mjs';
import { verifyAdminDataKey } from '@/lib/adminDataAuth';
import { isInviteToken,validOwnerPassword } from '@/lib/platformPolicy.mjs';
import { requestStaffReset,confirmStaffReset } from '@/lib/staffRecovery';
import { isEmailProviderConfigured } from '@/lib/emailDelivery';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request:NextRequest) {
 return withTenantRequest(request,async()=>{
  const t=currentTenant();
  if(t.demoVisitor || (t.legacy && t.host!=='admin.zipbook.app' && !(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(t.host))))return json({error:'Not available.'},403);
  try {
   const origin=new URL(request.headers.get('origin')||'');
   if(origin.host.toLowerCase()!==request.headers.get('host')?.toLowerCase() || (origin.protocol!=='https:' && !(process.env.NODE_ENV!=='production'&&origin.protocol==='http:')) || !request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Request not permitted.'},403);
  }catch{return json({error:'Request not permitted.'},403);}
  const body=await request.json().catch(()=>null);
  try {
   if(body?.action==='request') {
    if(t.legacy&&!verifyAdminDataKey(request))return json({error:'Master admin key is required.'},403);
    if(!isEmailProviderConfigured())return json({error:'Email recovery is temporarily unavailable. Contact ZipBook.'},503);
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return json({error:'Enter a valid email address.'},400);
    await requestStaffReset(email).catch(()=>{console.error('Staff recovery request failed.');});
    return json({message:'If an eligible staff account exists, a password reset email will be sent. Check spam or contact ZipBook if it does not arrive.'});
   }
   if(body?.action==='confirm') {
    if(!isInviteToken(body.token)||!validOwnerPassword(body.password))return json({error:'Use a valid reset link and a password of 14–128 characters.'},400);
    if(!await confirmStaffReset(body.token,body.password))return json({error:'This link is invalid, expired or already used. Request a new one.'},400);
    return json({message:'Password changed. Sign in again with your new password.'});
   }
   return json({error:'Invalid request.'},400);
  }catch{console.error('Staff recovery operation failed.');return json({error:'Recovery is temporarily unavailable. Try again later.'},503);}
 });
}
