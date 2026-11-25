import { platformTransaction } from './dbProvider';
import { sendZipBookEmail } from './emailDelivery';
import { PlatformError } from './platformStore';
export type OnboardingKind = 'invitation'|'diary'|'live';
export const escapeMail = (s:string) => s.replace(/[&<>"']/g,c=>(({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as Record<string,string>)[c]||c));
export function brandedEmail(title:string,body:string) {
 return `<div style="background:#edf5fc;padding:24px;font-family:Arial,sans-serif;color:#14304a"><div style="max-width:560px;margin:auto;background:white;padding:28px;border-radius:16px"><img src="https://zipbook.app/icons/icon-72.png" width="60" height="60" alt="ZipBook"><h1 style="color:#336699;font-size:24px">${escapeMail(title)}</h1>${body}<p>Kind regards,<br>The ZipBook Team<br>zipbook.app</p></div></div>`;
}
export function mailLink(url:string,label:string) {return `<p><a style="display:inline-block;background:#336699;color:white;padding:12px 20px;border-radius:24px;text-decoration:none" href="${escapeMail(url)}">${escapeMail(label)}</a></p><p>${escapeMail(url)}</p>`;}
export async function trackedOnboardingEmail(id:string,kind:OnboardingKind,input:Parameters<typeof sendZipBookEmail>[0]) {
 const log=await platformTransaction(async c=>(await c.query<{id:string}>(`INSERT INTO public.zipbook_onboarding_emails(practice_id,kind) VALUES($1,$2) RETURNING id`,[id,kind])).rows[0].id);
 const result=await sendZipBookEmail(input);
 await platformTransaction(async c=>{await c.query(`UPDATE public.zipbook_onboarding_emails SET provider_id=$2,status=$3 WHERE id=$1`,[log,result.providerId||null,result.delivered?'accepted':'failed']);});
 return result;
}
export async function sendActivationEmail(id:string,kind:'diary'|'live') {
 const b=await platformTransaction(async c=>(await c.query<{name:string;tenant_slug:string;owner_email:string}>(`SELECT p.name,p.tenant_slug,p.owner_email FROM public.practices p JOIN public.zipbook_owner_invitations i ON i.practice_id=p.id WHERE p.id=$1 AND p.plan_code='pilot' AND p.pilot_enabled AND i.verified_at IS NOT NULL AND ($2='diary' OR p.onboarding_completed)`,[id,kind])).rows[0]);
 if(!b) throw new PlatformError('Enable the relevant business access before sending this email.');
 const base=`https://${b.tenant_slug}.zipbook.app`, diary=`${base}/admin`, book=`${base}/book`;
 const subject=kind==='diary'?'Your ZipBook Practice Diary is ready':'Congratulations! Your ZipBook business is now live';
 const instructions=kind==='diary'?'Your diary is unlocked. Sign in with the password you created when accepting your invitation. Confirm business details, logo, practitioners, procedures, working hours and staff. Public bookings stay closed until approved.':'Your public booking page is open. Share the booking link with your customers. Appointments will appear in your Practice Diary.';
 return trackedOnboardingEmail(id,kind,{to:b.owner_email,subject,text:`${b.name}\n${instructions}\nLogin email: ${b.owner_email}\nDiary: ${diary}${kind==='live'?`\nBooking: ${book}`:''}\nThe ZipBook Team`,html:brandedEmail(subject,`<p>${escapeMail(b.name)}</p><p>${instructions}</p><p>Login email: ${escapeMail(b.owner_email)}</p>${mailLink(diary,'Open your Practice Diary')}${kind==='live'?mailLink(book,'Open your Customer Booking Page'):''}`)});
}
const events=new Set(['sent','delivered','delivery_delayed','bounced','complained','failed','suppressed','canceled','queued','scheduled','opened','clicked']);
export async function refreshOnboardingStatus(id:string) {
 const key=process.env.ZIPBOOK_RESEND_STATUS_KEY||process.env.RESEND_API_KEY;
 if(!key) throw new PlatformError('Configure Resend before checking delivery.');
 const rows=await platformTransaction(async c=>(await c.query<{id:string;provider_id:string}>(`SELECT id,provider_id FROM (SELECT DISTINCT ON(kind) id,provider_id,kind,checked_at FROM public.zipbook_onboarding_emails WHERE practice_id=$1 ORDER BY kind,created_at DESC,id DESC) e WHERE provider_id IS NOT NULL AND (checked_at IS NULL OR checked_at < now()-interval '30 seconds')`,[id])).rows);
 let failed=false;
 for(const row of rows) {
  try {
   const r=await fetch(`https://api.resend.com/emails/${encodeURIComponent(row.provider_id)}`,{headers:{Authorization:`Bearer ${key}`},cache:'no-store',signal:AbortSignal.timeout(4000)});
   const data=await r.json().catch(()=>null);
   if(!r.ok||!events.has(data?.last_event)){failed=true;continue;}
   await platformTransaction(async c=>{await c.query(`UPDATE public.zipbook_onboarding_emails SET status=$2,checked_at=now() WHERE id=$1`,[row.id,data.last_event]);});
  } catch {failed=true;}
 }
 return failed?'Some statuses could not be retrieved. Check the Resend dashboard or status API key.':'Delivery status refreshed (latest messages; 30-second refresh limit).';
}
