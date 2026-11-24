// Ver-0.063.8: hashed-IP demo grants and email-verified repeat access.
// Platform transactions are limited to the explicit public-demo host and tenant routes.
import {createHash,createHmac,randomInt,timingSafeEqual} from 'node:crypto';
import {NextRequest} from 'next/server';
import {platformTransaction} from './dbProvider';
import {sendZipBookEmail,buildOtpEmailHtml} from './emailDelivery';

const MAX_SESSIONS_PER_DAY=4;
const MAX_CODES_PER_DAY=4;
const FINGERPRINT_PREFIX='zipbook-demo-visit-v1';
function secret(){return process.env.ZIPBOOK_DEMO_SESSION_SECRET||'';}
function fingerprint(request:NextRequest){
  // Prefer the IP supplied by Netlify, NOT a client-controlled forwarded chain.
  const ip=(request.headers.get('x-nf-client-connection-ip')||'').trim();
  if(process.env.NODE_ENV==='production' && !ip)throw new Error('Demo request could not be validated.');
  const source=ip || (process.env.NODE_ENV!=='production'?'local-test-address':'');
  if(!source || source.length>64 || secret().length<32)throw new Error('Demo security is not configured.');
  return createHash('sha256').update(`${FINGERPRINT_PREFIX}:${secret()}:${source}`).digest('hex');
}
function otpHash(key:string,email:string,code:string){
  return createHmac('sha256',secret()).update(`zipbook-demo-extension:${key}:${email}:${code}`).digest('hex');
}
function constantTimeMatch(a:string,b:string){
  if(!/^[a-f0-9]{64}$/.test(a)||!/^[a-f0-9]{64}$/.test(b))return false;
  return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}
function validateContact(data:unknown){
  const body=data&&typeof data==='object'?data as Record<string,unknown>:{};
  const firstName=typeof body.firstName==='string'?body.firstName.trim():'';
  const surname=typeof body.surname==='string'?body.surname.trim():'';
  const phone=typeof body.phone==='string'?body.phone.replace(/[\s().-]/g,''):'';
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(firstName.length<2||firstName.length>80||surname.length<2||surname.length>80)throw new Error('Enter your first name and surname.');
  if(!/^\+[1-9]\d{7,14}$/.test(phone))throw new Error('Enter a mobile number including its country code, for example +447123456789.');
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');
  return {firstName,surname,phone,email};
}

export async function beginPublicDemoVisit(request:NextRequest):Promise<'granted'|'verify-email'>{
  const key=fingerprint(request);
  return platformTransaction(async client=>{
    await client.query(`INSERT INTO public.zipbook_public_demo_visitors(fingerprint) VALUES($1) ON CONFLICT DO NOTHING`,[key]);
    const result=await client.query<{sessions_granted:number;sessions_today:number;daily_window_start:string}>(`
      SELECT sessions_granted,sessions_today,daily_window_start FROM public.zipbook_public_demo_visitors WHERE fingerprint=$1 FOR UPDATE`,[key]);
    const row=result.rows[0];
    if(!row)throw new Error('Demo access is unavailable.');
    const startsToday=new Date(row.daily_window_start).getTime()>Date.now()-86400000?Number(row.sessions_today):0;
    if(startsToday>=MAX_SESSIONS_PER_DAY)throw new Error('Daily demo limit reached for this network. Please return tomorrow.');
    if(Number(row.sessions_granted)===0){
      await client.query(`UPDATE public.zipbook_public_demo_visitors SET sessions_granted=1,sessions_today=1,daily_window_start=now(),first_started_at=now(),last_started_at=now(),challenge_passed_until=null WHERE fingerprint=$1`,[key]);
      return 'granted';
    }
    await client.query(`UPDATE public.zipbook_public_demo_visitors SET challenge_passed_until=now()+interval '10 minutes',otp_hash=null,otp_expires_at=null,pending_first_name=null,pending_surname=null,pending_phone=null,pending_email=null WHERE fingerprint=$1`,[key]);
    return 'verify-email';
  });
}

export async function requestPublicDemoExtensionCode(request:NextRequest,body:unknown){
  const key=fingerprint(request);
  const contact=validateContact(body);
  const code=String(randomInt(100000,1000000));
  const hash=otpHash(key,contact.email,code);
  // Set challenge state atomically before sending. No token is granted here.
  await platformTransaction(async client=>{
    const rows=await client.query<{sessions_granted:number;otp_requests:number;otp_sent_at:string|null;otp_window_start:string;challenge_passed_until:string|null}>(`
      SELECT sessions_granted,otp_requests,otp_sent_at,daily_window_start,challenge_passed_until FROM public.zipbook_public_demo_visitors WHERE fingerprint=$1 FOR UPDATE`,[key]);
    const row=rows.rows[0];
    if(!row||Number(row.sessions_granted)<1||!row.challenge_passed_until||new Date(row.challenge_passed_until).getTime()<Date.now())throw new Error('Start the demo security check again.');
    const requestsToday=new Date(row.otp_window_start).getTime()>Date.now()-86400000?Number(row.otp_requests):0;
    if(requestsToday>=MAX_CODES_PER_DAY)throw new Error('Too many verification emails requested from this network today.');
    if(row.otp_sent_at&&Date.now()-new Date(row.otp_sent_at).getTime()<60000)throw new Error('Please wait one minute before requesting another code.');
    await client.query(`UPDATE public.zipbook_public_demo_visitors SET
       pending_first_name=$2,pending_surname=$3,pending_phone=$4,pending_email=$5,
       otp_hash=$6,otp_expires_at=now()+interval '10 minutes',otp_attempts=0,
       otp_sent_at=now(),consented_at=now(),otp_requests=$7,otp_window_start=CASE WHEN otp_window_start<now()-interval '24 hours' THEN now() ELSE otp_window_start END
       WHERE fingerprint=$1`,[key,contact.firstName,contact.surname,contact.phone,contact.email,hash,requestsToday+1]);
  });
  const result=await sendZipBookEmail({to:contact.email,subject:'Your ZipBook demo extension verification code',html:buildOtpEmailHtml({code,purpose:'login',businessName:'ZipBook demo'})});
  if(!result.delivered){
    await platformTransaction(async client=>{await client.query(`UPDATE public.zipbook_public_demo_visitors SET otp_hash=null,otp_expires_at=null WHERE fingerprint=$1 AND otp_hash=$2`,[key,hash]);});
    throw new Error('We could not email your verification code. Please check that ZipBook email delivery is configured.');
  }
  return {sent:true,destination:contact.email.replace(/^(.{1,2}).*(@.*)$/,'$1***$2'),expiresInSeconds:600};
}

export async function verifyPublicDemoExtensionCode(request:NextRequest,code:unknown){
  const key=fingerprint(request);
  if(typeof code!=='string'||!/^\d{6}$/.test(code))throw new Error('Enter the six-digit code from your email.');
  return platformTransaction(async client=>{
    const rows=await client.query<{otp_hash:string|null;pending_email:string|null;otp_attempts:number;otp_expires_at:string|null;challenge_passed_until:string|null;sessions_today:number;daily_window_start:string}>(`
      SELECT otp_hash,pending_email,otp_attempts,otp_expires_at,challenge_passed_until,sessions_today,daily_window_start FROM public.zipbook_public_demo_visitors WHERE fingerprint=$1 FOR UPDATE`,[key]);
    const row=rows.rows[0];
    if(!row||!row.otp_hash||!row.pending_email||!row.otp_expires_at||!row.challenge_passed_until||new Date(row.otp_expires_at).getTime()<Date.now()||new Date(row.challenge_passed_until).getTime()<Date.now()||Number(row.otp_attempts)>=5)throw new Error('Verification has expired. Start a new demo request.');
    const startsToday=new Date(row.daily_window_start).getTime()>Date.now()-86400000?Number(row.sessions_today):0;
    if(startsToday>=MAX_SESSIONS_PER_DAY)throw new Error('Daily demo limit reached for this network.');
    if(!constantTimeMatch(row.otp_hash,otpHash(key,row.pending_email,code))){
      await client.query(`UPDATE public.zipbook_public_demo_visitors SET otp_attempts=otp_attempts+1 WHERE fingerprint=$1`,[key]);
      // Use a returned status rather than throwing, so the failed attempt is committed.
      return false;
    }
    await client.query(`UPDATE public.zipbook_public_demo_visitors SET sessions_granted=sessions_granted+1,
      sessions_today=$2,daily_window_start=CASE WHEN daily_window_start<now()-interval '24 hours' THEN now() ELSE daily_window_start END,
      last_started_at=now(),last_verified_at=now(),otp_hash=null,otp_expires_at=null,
      challenge_passed_until=null,otp_attempts=0 WHERE fingerprint=$1`,[key,startsToday+1]);
    return true;
  });
}
