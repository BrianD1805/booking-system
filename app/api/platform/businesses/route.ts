import { NextRequest } from 'next/server';
import { withPlatformRequest, platformJson } from '@/lib/platformRequest';
import { listBusinesses, provisionBusiness, reissueInvitation, setBusinessState } from '@/lib/platformStore';
import { validateBusiness } from '@/lib/platformPolicy.mjs';
import { isEmailProviderConfigured, sendZipBookEmail } from '@/lib/emailDelivery';
export const dynamic='force-dynamic';
async function invite(input:{email:string;token:string}) {
  const link=`https://zipbook.app/join#${input.token}`;
  const result=await sendZipBookEmail({to:input.email,subject:'Set up your ZipBook business account',text:`You have been invited to ZipBook. Verify your email and choose your password using this one-time link, valid for 48 hours: ${link}\nYour diary will be enabled once setup is approved. If you did not expect this invitation, ignore this email.`,html:`<h2>Welcome to ZipBook</h2><p>Verify your email and choose your password using the link below. It is valid for 48 hours and can only be used once.</p><p><a href="${link}">Set up your business account</a></p><p>Your diary will be enabled once setup is approved. If you did not expect this invitation, ignore this email.</p>`});
  return platformJson({ok:true,message:result.delivered?'Invitation sent.':'Business saved, but email delivery failed. Use Resend invitation after checking Resend configuration.',delivered:result.delivered});
}
export async function GET(request: NextRequest) {
  return withPlatformRequest(request,true,async()=>platformJson({businesses:await listBusinesses(),accountsEnabled:process.env.ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS==='1',emailConfigured:isEmailProviderConfigured()}));
}
export async function POST(request: NextRequest) {
  return withPlatformRequest(request,true,async()=>{
    const body=await request.json().catch(()=>null);
    if(!body||typeof body!=='object') return platformJson({error:'Invalid request.'},400);
    if(body.action==='create') {
      if(!isEmailProviderConfigured()) return platformJson({error:'Configure Resend before creating a business.'},400);
      let input;try {input=validateBusiness(body.business);} catch(error) {return platformJson({error:error instanceof Error?error.message:'Invalid business details.'},400);}
      return invite(await provisionBusiness(input));
    }
    const id=typeof body.id==='string'?body.id:'';
    if(!/^practice-[a-f0-9-]{36}$/.test(id)) return platformJson({error:'Invalid business.'},400);
    if(body.action==='resend') {
      if(!isEmailProviderConfigured()) return platformJson({error:'Configure Resend before sending an invitation.'},400);
      return invite(await reissueInvitation(id));
    }
    if(body.action==='activate'||body.action==='publish'||body.action==='suspend') {
      if(body.confirmed!==true) return platformJson({error:'Confirm this change first.'},400);
      await setBusinessState(id,body.action);
      return platformJson({ok:true,message:'Business status updated.'});
    }
    return platformJson({error:'Unknown action.'},400);
  });
}
