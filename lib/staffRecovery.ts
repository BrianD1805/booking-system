import { randomUUID,createHash } from 'node:crypto';
import { currentTenant } from './tenantScope.mjs';
import { tenantTransaction } from './dbProvider';
import { makeInviteToken,inviteHash } from './platformPolicy.mjs';
import { hashStaffPassword } from './staffPassword.mjs';
import { sendZipBookEmail } from './emailDelivery';
import { brandedEmail,escapeMail,mailLink } from './onboardingEmail';
import type { PoolClient } from 'pg';
const fingerprint=(value:string)=>createHash('sha256').update(value).digest('hex');
const tenantId=()=>currentTenant().practiceId;
async function rate(c:PoolClient,bucket:string,max:number) {
 const result=await c.query<{attempts:number}>(`INSERT INTO public.zipbook_staff_reset_limits(practice_id,bucket) VALUES($1,$2) ON CONFLICT(practice_id,bucket) DO UPDATE SET attempts=CASE WHEN zipbook_staff_reset_limits.window_start<=now()-interval '30 minutes' THEN 1 ELSE least(zipbook_staff_reset_limits.attempts+1,1000) END,window_start=CASE WHEN zipbook_staff_reset_limits.window_start<=now()-interval '30 minutes' THEN now() ELSE zipbook_staff_reset_limits.window_start END RETURNING attempts`,[tenantId(),bucket]);
 return result.rows[0].attempts<=max;
}
async function audit(c:PoolClient,id:string,action:string) {await c.query(`INSERT INTO public.audit_logs(id,practice_id,action,entity_type,entity_id,source) VALUES($1,$2,$3,'staff',$4,'staff-recovery')`,[randomUUID(),tenantId(),action,id]);}
function diaryUrl(){const t=currentTenant();return t.legacy?'https://admin.zipbook.app/admin':`https://${t.tenantSlug}.zipbook.app/admin`;}
export async function requestStaffReset(email:string) {
 const token=makeInviteToken();
 const row=await tenantTransaction(async c=>{
  if(!await rate(c,'request-total',30)) return null;
  const staff=(await c.query<{id:string;email:string;password_hash:string}>(`SELECT id,email,password_hash FROM public.admin_staff_members WHERE practice_id=$1 AND lower(email)=$2 AND active FOR UPDATE`,[tenantId(),email])).rows[0];
  if(!staff||!await rate(c,`request-staff:${staff.id}`,3))return null;
  await c.query(`INSERT INTO public.zipbook_staff_reset_tokens(practice_id,staff_id,token_hash,email,credential_fingerprint,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '30 minutes') ON CONFLICT(practice_id,staff_id) DO UPDATE SET token_hash=excluded.token_hash,email=excluded.email,credential_fingerprint=excluded.credential_fingerprint,expires_at=excluded.expires_at,created_at=now()`,[tenantId(),staff.id,inviteHash(token),staff.email,fingerprint(staff.password_hash)]);
  await audit(c,staff.id,'staff_password_reset_requested');return staff;
 });
 if(!row)return;
 const link=diaryUrl().replace(/\/admin$/,'/staff-reset')+'#'+token;
 const result=await sendZipBookEmail({to:row.email,subject:'Reset your ZipBook staff password',text:`A password reset was requested for ${currentTenant().name}. Open this single-use link within 30 minutes: ${link}\nIf you did not request this, ignore it.`,html:brandedEmail('Reset your staff password',`<p>A reset was requested for ${escapeMail(currentTenant().name)}. This link expires after 30 minutes and works once only.</p>${mailLink(link,'Choose a new password')}<p>If you did not request this, ignore this email.</p>`)});
 if(!result.delivered) await tenantTransaction(async c=>{await c.query('DELETE FROM public.zipbook_staff_reset_tokens WHERE practice_id=$1 AND token_hash=$2',[tenantId(),inviteHash(token)]);await audit(c,row.id,'staff_password_reset_email_failed');});
}
export async function notifyStaffPasswordChanged(email:string) {
 return sendZipBookEmail({to:email,subject:'Your ZipBook staff password has changed',text:`Your staff password for ${currentTenant().name} has changed. If you did not expect this, contact your business owner or ZipBook immediately. Diary: ${diaryUrl()}`,html:brandedEmail('Your staff password has changed',`<p>Your password for ${escapeMail(currentTenant().name)} has changed. If you did not expect this, contact your business owner or ZipBook immediately.</p>${mailLink(diaryUrl(),'Open your Practice Diary')}`)});
}
export async function confirmStaffReset(token:string,password:string) {
 const digest=inviteHash(token);
 const staff=await tenantTransaction(async c=>{
  if(!await rate(c,'confirm-total',60))return null;
  // Lock the staff row first (same ordering as issuing a replacement token).
  const row=(await c.query<{id:string;email:string;password_hash:string;credential_fingerprint:string}>(`SELECT s.id,s.email,s.password_hash,t.credential_fingerprint FROM public.admin_staff_members s JOIN public.zipbook_staff_reset_tokens t ON t.staff_id=s.id AND t.practice_id=s.practice_id WHERE s.practice_id=$1 AND t.token_hash=$2 AND t.expires_at>now() AND s.active AND s.email=t.email FOR UPDATE OF s`,[tenantId(),digest])).rows[0];
  if(!row||fingerprint(row.password_hash)!==row.credential_fingerprint)return null;
  const consumed=await c.query(`DELETE FROM public.zipbook_staff_reset_tokens WHERE practice_id=$1 AND staff_id=$2 AND token_hash=$3 AND expires_at>now() RETURNING staff_id`,[tenantId(),row.id,digest]);
  if(!consumed.rowCount)return null;
  await c.query('UPDATE public.admin_staff_members SET password_hash=$3,updated_at=now() WHERE practice_id=$1 AND id=$2',[tenantId(),row.id,hashStaffPassword(password)]);
  await c.query('UPDATE public.admin_staff_sessions SET revoked_at=now() WHERE practice_id=$1 AND staff_id=$2 AND revoked_at IS NULL',[tenantId(),row.id]);
  await c.query('DELETE FROM public.zipbook_staff_login_limits WHERE practice_id=$1 AND staff_id=$2',[tenantId(),row.id]);
  await audit(c,row.id,'staff_password_reset_completed');return row;
 });
 if(!staff)return false;
 const result=await notifyStaffPasswordChanged(staff.email);
 if(!result.delivered)await tenantTransaction(async c=>audit(c,staff.id,'staff_password_change_email_failed')).catch(()=>{});
 return true;
}
