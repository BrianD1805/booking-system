// Offline operator tool. No database connection and no real tenant is created automatically.
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashStaffPassword } from '../lib/staffPassword.mjs';
import { classifyTenantHost } from '../lib/tenantScope.mjs';
const [slug,name,ownerName,ownerEmail,timezone,currency,country] = process.argv.slice(2);
const usage='Usage: node scripts/prepare-business.mjs <slug> "Business name" "Owner name" owner@example.com Africa/Johannesburg ZAR ZA';
if (!slug || classifyTenantHost(`${slug}.zipbook.app`,{enabled:true}).kind !== 'business' || slug !== slug.toLowerCase() || !name || !ownerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail ?? '') || !/^[A-Z]{3}$/.test(currency ?? '') || !/^[A-Z]{2}$/.test(country ?? '') || !timezone) {console.error(usage);process.exit(1);}
try {new Intl.DateTimeFormat('en-GB',{timeZone:timezone});} catch {console.error('Invalid IANA timezone.');process.exit(1);}
const q = s => "'"+String(s).replace(/'/g,"''")+"'";
const practiceId=`practice-${randomUUID()}`, staffId=`staff-${randomUUID()}`, host=`${slug}.zipbook.app`;
const password=randomBytes(24).toString('base64url');
const sql=`-- Creates a DISABLED pilot; this is not a live activation.\nBEGIN;\nSET LOCAL standard_conforming_strings=on;\nINSERT INTO public.practices(id,name,public_display_name,booking_subdomain,tenant_slug,primary_domain,client_app_url,admin_app_url,public_booking_path,owner_name,owner_email,timezone,currency_code,country_code,tenant_status,subscription_status,plan_code,pilot_enabled,onboarding_completed,medical_data_mode,fallback_sms,mobile_push) VALUES (${[practiceId,name,name,host,slug,host,`https://${host}/book`,`https://${host}/admin`,'/book',ownerName,ownerEmail.toLowerCase(),timezone,currency,country,'active','foundation','pilot'].map(q).join(',')},false,false,'Tenant-scoped Supabase',false,false);\nINSERT INTO public.admin_staff_members(id,practice_id,full_name,email,role,active,password_hash) VALUES (${[staffId,practiceId,ownerName,ownerEmail.toLowerCase(),'Owner'].map(q).join(',')},true,${q(hashStaffPassword(password))});\nINSERT INTO public.audit_logs(id,practice_id,action,entity_type,entity_id,source) VALUES (${[randomUUID(),practiceId,'pilot_business_created','practice',practiceId,'platform-operator'].map(q).join(',')});\nCOMMIT;\n-- Deliberately no activation statement. Enable only after staging and explicit approval.\n`;
const file=join(tmpdir(),`zipbook-pilot-${slug}-${randomUUID()}.sql`);
writeFileSync(file,sql,{mode:0o600,flag:'wx'});
console.log(`SQL file: ${file}\nOwner email: ${ownerEmail}\nGenerated initial password (store securely): ${password}\nThe business remains disabled. Never commit this generated SQL or password to Git.`);
