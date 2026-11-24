import {randomUUID} from 'node:crypto';
import {platformTransaction} from './dbProvider';
import {PlatformError} from './platformStore';
import {demoResetAllowedIds, validateDemoSettings, assertDemoResetConfirmation, type DemoSettings} from './demoResetPolicy.mjs';

type Row = {
  id:string; name:string; working_days:number[]; working_start_time:string; working_end_time:string;
  slot_interval_minutes:number; minimum_notice_hours:number; max_booking_ahead_days:number;
  lunch_break_enabled:boolean|null; lunch_break_start:string|null; lunch_break_end:string|null;
  allow_same_day_bookings:boolean|null; cancellation_policy_note:string|null;
  client_phone_country_code:string|null; country_code:string|null; timezone:string|null; currency_code:string|null;
};

function allowed():string[]{return demoResetAllowedIds(process.env.ZIPBOOK_DEMO_RESET_ALLOWED_IDS);}
function requireAllowed(id:string) {
  if (!allowed().includes(id)) throw new PlatformError('This business is not approved for demo resets. Set ZIPBOOK_DEMO_RESET_ALLOWED_IDS in Netlify to opt in.');
}
function asSettings(row:Row): DemoSettings {
  return {
    workingDays:row.working_days,
    workingStartTime:row.working_start_time.slice(0,5),
    workingEndTime:row.working_end_time.slice(0,5),
    slotIntervalMinutes:row.slot_interval_minutes,
    minimumNoticeHours:row.minimum_notice_hours,
    maxBookingAheadDays:row.max_booking_ahead_days,
    lunchBreakEnabled:row.lunch_break_enabled === true,
    lunchBreakStart:(row.lunch_break_start||'13:00').slice(0,5),
    lunchBreakEnd:(row.lunch_break_end||'14:00').slice(0,5),
    allowSameDayBookings:row.allow_same_day_bookings !== false,
    cancellationPolicyNote:row.cancellation_policy_note||'',
    clientPhoneCountryCode:row.client_phone_country_code||row.country_code||'GB',
    timezone:row.timezone||'Africa/Nairobi',
    currencyCode:row.currency_code||'KES'
  };
}

export async function listDemoTargets(){
  const ids=allowed();
  if (!ids.length) return [];
  return platformTransaction(async c=>(await c.query<{id:string;name:string;tenant_slug:string|null}>(
    `SELECT id,name,tenant_slug FROM public.practices WHERE id = ANY($1::text[]) ORDER BY name`,[ids])).rows);
}
export async function demoProfile(id:string){
  requireAllowed(id);
  return platformTransaction(async c=>{
    const row=(await c.query<Row>(`SELECT id,name,working_days,working_start_time::text,working_end_time::text,slot_interval_minutes,minimum_notice_hours,max_booking_ahead_days,lunch_break_enabled,lunch_break_start::text,lunch_break_end::text,allow_same_day_bookings,cancellation_policy_note,client_phone_country_code,country_code,timezone,currency_code FROM public.practices WHERE id=$1`,[id])).rows[0];
    if(!row) throw new PlatformError('Demo business not found.');
    const preset=(await c.query<{default_settings:DemoSettings;saved_at:string}>(`SELECT default_settings,saved_at::text FROM public.zipbook_demo_reset_profiles WHERE practice_id=$1`,[id])).rows[0];
    return {business:{id:row.id,name:row.name},defaults:preset ? validateDemoSettings({...asSettings(row),...preset.default_settings}) : asSettings(row),saved:!!preset,savedAt:preset?.saved_at??null};
  });
}
export async function saveDemoDefaults(id:string,input:unknown){
  requireAllowed(id);
  let settings:DemoSettings;
  try {settings=validateDemoSettings(input);}
  catch(e){throw new PlatformError(e instanceof Error?e.message:'Invalid defaults.');}
  await platformTransaction(async c=>{
    const row=(await c.query(`SELECT id FROM public.practices WHERE id=$1 FOR UPDATE`,[id])).rows[0];
    if(!row) throw new PlatformError('Demo business not found.');
    await c.query(`INSERT INTO public.zipbook_demo_reset_profiles(practice_id,default_settings,saved_at) VALUES ($1,$2::jsonb,now()) ON CONFLICT(practice_id) DO UPDATE SET default_settings=EXCLUDED.default_settings,saved_at=now()`,[id,JSON.stringify(settings)]);
    await c.query(`INSERT INTO public.audit_logs(id,practice_id,action,entity_type,entity_id,source) VALUES ($1,$2,'platform_demo_defaults_saved','practice',$2,'platform-admin')`,[randomUUID(),id]);
  });
  return {message:'Demo defaults saved. Existing appointments and settings have not been changed.'};
}
export async function resetDemoData(id:string,confirmation:string,acknowledged:boolean){
  requireAllowed(id);
  try{assertDemoResetConfirmation(confirmation,acknowledged);}catch(e){throw new PlatformError(e instanceof Error?e.message:'Confirmation required.');}
  return platformTransaction(async c=>{
    // Protect the practice row and run all child-table deletions in one transaction.
    const practice=(await c.query<Row>(`SELECT id,working_days,working_start_time::text,working_end_time::text,slot_interval_minutes,minimum_notice_hours,max_booking_ahead_days,lunch_break_enabled,lunch_break_start::text,lunch_break_end::text,allow_same_day_bookings,cancellation_policy_note,client_phone_country_code,country_code,timezone,currency_code FROM public.practices WHERE id=$1 FOR UPDATE`,[id])).rows[0];
    if(!practice) throw new PlatformError('Demo business not found.');
    const saved=(await c.query<{default_settings:unknown}>(`SELECT default_settings FROM public.zipbook_demo_reset_profiles WHERE practice_id=$1`,[id])).rows[0];
    if(!saved) throw new PlatformError('Save the default settings before the first reset.');
    let s:DemoSettings;
    try{s=validateDemoSettings({...asSettings(practice),...(saved.default_settings as object)});}
    catch{throw new PlatformError('Saved demo defaults are invalid. Save them again before resetting.');}
    const count=(await c.query<{bookings:number;customers:number}>(`SELECT (SELECT count(*)::int FROM public.bookings WHERE practice_id=$1) AS bookings,(SELECT count(*)::int FROM public.customers WHERE practice_id=$1) AS customers`,[id])).rows[0];
    // Scoped deletes only. NEVER truncate shared tables, delete practitioner/staff accounts, or touch secrets.
    for(const table of [
      'notification_logs','late_messages','client_push_subscriptions',
      'customer_documents','customer_family_members','client_sessions',
      'client_login_otps','client_accounts','zipbook_client_auth_limits',
      'bookings','customers','blocked_dates','blocked_times'
    ]){
      await c.query(`DELETE FROM public.${table} WHERE practice_id=$1`,[id]);
    }
    await c.query(`DELETE FROM public.practitioner_blocked_times WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE practice_id=$1)`,[id]);
    await c.query(`DELETE FROM public.audit_logs WHERE practice_id=$1 AND (source='client' OR entity_type IN ('booking','customer','client_account','client_session') OR action LIKE 'client_%' OR action LIKE 'booking_%' OR action LIKE 'customer_%')`,[id]);
    await c.query(`UPDATE public.practices SET working_days=$2::integer[], working_start_time=$3::time, working_end_time=$4::time, slot_interval_minutes=$5, minimum_notice_hours=$6, max_booking_ahead_days=$7, lunch_break_enabled=$8, lunch_break_start=$9::time, lunch_break_end=$10::time, allow_same_day_bookings=$11, cancellation_policy_note=$12, client_phone_country_code=$13, timezone=$14, currency_code=$15, updated_at=now() WHERE id=$1`,
      [id,s.workingDays,s.workingStartTime,s.workingEndTime,s.slotIntervalMinutes,s.minimumNoticeHours,s.maxBookingAheadDays,s.lunchBreakEnabled,s.lunchBreakStart,s.lunchBreakEnd,s.allowSameDayBookings,s.cancellationPolicyNote,s.clientPhoneCountryCode,s.timezone,s.currencyCode]);
    await c.query(`INSERT INTO public.audit_logs(id,practice_id,action,entity_type,entity_id,source,details) VALUES($1,$2,'platform_demo_data_reset','practice',$2,'platform-admin',$3::jsonb)`,[randomUUID(),id,JSON.stringify({bookings:count.bookings,customers:count.customers})]);
    return {message:`Demo data reset completed: ${count.bookings} bookings and ${count.customers} customers removed. Saved settings restored.`,counts:count};
  });
}
