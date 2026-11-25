import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { platformTransaction } from './dbProvider';
import { hashStaffPassword } from './staffPassword.mjs';
import { inviteHash, makeInviteToken, type BusinessInput } from './platformPolicy.mjs';

export class PlatformError extends Error {}
type BusinessRow = {id:string; name:string; tenant_slug:string; owner_name:string; owner_email:string; timezone:string; currency_code:string; country_code:string; pilot_enabled:boolean; onboarding_completed:boolean; platform_suspended:boolean|null; verified_at:string|null; expires_at:string|null; active_practitioners:number; active_services:number; configured_practitioners:number};
async function audit(c:PoolClient,id:string,action:string) {
  await c.query('INSERT INTO public.audit_logs(id,practice_id,action,entity_type,entity_id,source) VALUES($1,$2,$3,$4,$2,$5)',[randomUUID(),id,action,'practice','platform-admin']);
}
export async function listBusinesses() {
  return platformTransaction(async c => (await c.query<BusinessRow>(`SELECT p.id,p.name,p.tenant_slug,p.owner_name,p.owner_email,p.timezone,p.currency_code,p.country_code,p.pilot_enabled,p.onboarding_completed,p.platform_suspended,i.verified_at::text,i.expires_at::text,
    (SELECT coalesce(jsonb_object_agg(e.kind,jsonb_build_object('status',e.status,'createdAt',e.created_at,'checkedAt',e.checked_at)),'{}'::jsonb) FROM (SELECT DISTINCT ON (kind) kind,status,created_at,checked_at FROM public.zipbook_onboarding_emails WHERE practice_id=p.id ORDER BY kind,created_at DESC,id DESC) e) AS emails,
    (SELECT count(*)::int FROM public.practitioners d WHERE d.practice_id=p.id AND d.active) AS active_practitioners,
    (SELECT count(*)::int FROM public.procedures s WHERE s.practice_id=p.id AND s.active) AS active_services,
    (SELECT count(*)::int FROM public.practitioners d WHERE d.practice_id=p.id AND d.active AND EXISTS(SELECT 1 FROM public.practitioner_working_hours h WHERE h.practitioner_id=d.id AND h.active) AND EXISTS(SELECT 1 FROM public.practitioner_procedures x JOIN public.procedures s ON s.id=x.procedure_id AND s.practice_id=p.id AND s.active WHERE x.practitioner_id=d.id)) AS configured_practitioners
    FROM public.practices p JOIN public.zipbook_owner_invitations i ON i.practice_id=p.id WHERE p.plan_code='pilot' ORDER BY p.created_at DESC`)).rows);
}
export async function provisionBusiness(input:BusinessInput) {
  const id=`practice-${randomUUID()}`, staff=`staff-${randomUUID()}`, token=makeInviteToken(), host=`${input.slug}.zipbook.app`;
  await platformTransaction(async c=>{
    await c.query(`INSERT INTO public.practices(id,name,public_display_name,booking_subdomain,tenant_slug,primary_domain,client_app_url,admin_app_url,public_booking_path,owner_name,owner_email,timezone,currency_code,country_code,tenant_status,subscription_status,plan_code,pilot_enabled,onboarding_completed,medical_data_mode,fallback_sms,mobile_push) VALUES($1,$2,$2,$3,$4,$3,$5,$6,'/book',$7,$8,$9,$10,$11,'active','foundation','pilot',false,false,'Tenant-scoped Supabase',false,false)`,[id,input.name,host,input.slug,`https://${host}/book`,`https://${host}/admin`,input.ownerName,input.ownerEmail,input.timezone,input.currency,input.country]);
    // An inactive account has no usable password until the email invitation is accepted.
    await c.query(`INSERT INTO public.admin_staff_members(id,practice_id,full_name,email,role,active,password_hash) VALUES($1,$2,$3,$4,'Owner',false,'invitation-not-accepted')`,[staff,id,input.ownerName,input.ownerEmail]);
    await c.query(`INSERT INTO public.zipbook_owner_invitations(practice_id,staff_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '48 hours')`,[id,staff,inviteHash(token)]);
    await audit(c,id,'platform_business_created');
  });
  return {id,email:input.ownerEmail,token};
}
export async function reissueInvitation(id:string) {
  const token=makeInviteToken();
  const email=await platformTransaction(async c=>{
    const row=(await c.query<{owner_email:string}>(`SELECT p.owner_email FROM public.practices p JOIN public.zipbook_owner_invitations i ON i.practice_id=p.id WHERE p.id=$1 AND p.plan_code='pilot' AND NOT p.pilot_enabled AND i.verified_at IS NULL FOR UPDATE OF p,i`,[id])).rows[0];
    if(!row) throw new PlatformError('Only an unverified business can receive a replacement invitation.');
    await c.query(`UPDATE public.zipbook_owner_invitations SET token_hash=$2,expires_at=now()+interval '48 hours' WHERE practice_id=$1`,[id,inviteHash(token)]);
    await audit(c,id,'platform_invitation_reissued'); return row.owner_email;
  });
  return {id,email,token};
}
export async function acceptInvitation(token:string,password:string) {
  return platformTransaction(async c=>{
    const row=(await c.query<{practice_id:string;staff_id:string}>(`SELECT i.practice_id,i.staff_id FROM public.zipbook_owner_invitations i JOIN public.practices p ON p.id=i.practice_id JOIN public.admin_staff_members s ON s.id=i.staff_id AND s.practice_id=p.id WHERE i.token_hash=$1 AND i.verified_at IS NULL AND i.expires_at>now() AND p.plan_code='pilot' AND NOT p.pilot_enabled AND s.role='Owner' AND NOT s.active AND lower(s.email)=lower(p.owner_email) FOR UPDATE OF p,i,s`,[inviteHash(token)])).rows[0];
    if(!row) throw new PlatformError('This invitation is invalid, expired or already used. Ask ZipBook for a new invitation.');
    await c.query('UPDATE public.admin_staff_members SET password_hash=$1,active=true,updated_at=now() WHERE id=$2 AND practice_id=$3',[hashStaffPassword(password),row.staff_id,row.practice_id]);
    await c.query('UPDATE public.zipbook_owner_invitations SET verified_at=now() WHERE practice_id=$1',[row.practice_id]);
    await audit(c,row.practice_id,'platform_owner_email_verified');
  });
}
export async function setBusinessState(id:string,action:'activate'|'publish'|'suspend') {
  return platformTransaction(async c=>{
    const row=(await c.query<{pilot_enabled:boolean;onboarding_completed:boolean;verified_at:string|null}>(`SELECT p.pilot_enabled,p.onboarding_completed,i.verified_at::text FROM public.practices p JOIN public.zipbook_owner_invitations i ON i.practice_id=p.id WHERE p.id=$1 AND p.plan_code='pilot' FOR UPDATE OF p,i`,[id])).rows[0];
    if(!row) throw new PlatformError('Business not found.');
    if(action==='suspend') {
      await c.query('UPDATE public.practices SET pilot_enabled=false,onboarding_completed=false,platform_suspended=true,updated_at=now() WHERE id=$1',[id]);
      await c.query('UPDATE public.admin_staff_sessions SET revoked_at=now() WHERE practice_id=$1 AND revoked_at IS NULL',[id]);
    } else {
      if(!row.verified_at) throw new PlatformError('The business owner must accept their email invitation first.');
      if(process.env.ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS!=='1') throw new PlatformError('Business accounts are not enabled in Netlify.');
      if(action==='activate') {
        if(row.pilot_enabled) throw new PlatformError('Diary access is already enabled.');
        await c.query('UPDATE public.practices SET pilot_enabled=true,onboarding_completed=false,platform_suspended=false,updated_at=now() WHERE id=$1',[id]);
      } else {
        if(!row.pilot_enabled) throw new PlatformError('Enable diary access first.');
        if(row.onboarding_completed) throw new PlatformError('Public bookings are already open.');
        const ready=(await c.query<{ready:boolean}>(`SELECT EXISTS(SELECT 1 FROM public.practitioners d JOIN public.practitioner_working_hours h ON h.practitioner_id=d.id AND h.active JOIN public.practitioner_procedures x ON x.practitioner_id=d.id JOIN public.procedures s ON s.id=x.procedure_id AND s.practice_id=d.practice_id AND s.active WHERE d.practice_id=$1 AND d.active) AS ready`,[id])).rows[0]?.ready;
        if(!ready) throw new PlatformError('Configure at least one active practitioner, working schedule and assigned active service first.');
        await c.query('UPDATE public.practices SET onboarding_completed=true,launched_at=now(),updated_at=now() WHERE id=$1',[id]);
      }
    }
    await audit(c,id,`platform_business_${action}`);
  });
}

// Customer data only; never restore demo defaults or change practice/staff settings.
export async function deleteBusinessCustomerData(id:string, confirmation:unknown) {
  return platformTransaction(async c=>{
    const practice=(await c.query<{tenant_slug:string;pilot_enabled:boolean}>(`SELECT p.tenant_slug,p.pilot_enabled FROM public.practices p JOIN public.zipbook_owner_invitations i ON i.practice_id=p.id WHERE p.id=$1 AND p.plan_code='pilot' FOR UPDATE OF p`,[id])).rows[0];
    if(!practice) throw new PlatformError('Business not found.');
    if(practice.pilot_enabled) throw new PlatformError('Suspend access before deleting data to prevent new activity.');
    if(confirmation!==`DELETE ${practice.tenant_slug}`) throw new PlatformError('Type the exact business confirmation.');
    const count=(await c.query<{bookings:number;customers:number}>(`SELECT (SELECT count(*)::int FROM public.bookings WHERE practice_id=$1) AS bookings,(SELECT count(*)::int FROM public.customers WHERE practice_id=$1) AS customers`,[id])).rows[0];
    for(const table of ['notification_logs','late_messages','client_push_subscriptions','customer_documents','customer_family_members','client_sessions','client_login_otps','client_accounts','zipbook_client_auth_limits','bookings','customers']) {
      await c.query(`DELETE FROM public.${table} WHERE practice_id=$1`,[id]);
    }
    await c.query(`DELETE FROM public.audit_logs WHERE practice_id=$1 AND (source='client' OR entity_type IN ('booking','customer','client_account','client_session') OR action LIKE 'client_%' OR action LIKE 'booking_%' OR action LIKE 'customer_%')`,[id]);
    await c.query(`INSERT INTO public.audit_logs(id,practice_id,action,entity_type,entity_id,source,details) VALUES($1,$2,'platform_customer_data_deleted','practice',$2,'platform-admin',$3::jsonb)`,[randomUUID(),id,JSON.stringify(count)]);
    return {message:`Deleted ${count.bookings} bookings and ${count.customers} customers. Practice and diary settings retained.`,counts:count};
  });
}
