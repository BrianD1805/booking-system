import {createHash} from 'node:crypto';
import {issuePublicDemoSession,readPublicDemoSession} from './publicDemoSession.mjs';
import {NextRequest, NextResponse} from 'next/server';
import {platformTransaction} from './dbProvider';
import {currentTenant} from './tenantScope.mjs';
import {getDefaultPracticeId} from './tenant';

const DEMO_COOKIE = 'zipbook_public_demo';
const DEMO_DOMAIN = 'zipbook.app';
const demoAllowedId = () => (process.env.ZIPBOOK_REAL_DEMO_TENANT_ID || '').trim();

// Deliberate multi-part opt-in. Never turn an ordinary live tenant into a public demo by accident.
export function realDemoConfigured() {
  const id=demoAllowedId();
  return isPublicDemoEnabled() && process.env.ZIPBOOK_REAL_DEMO_ENABLED === '1' &&
    process.env.ZIPBOOK_REAL_DEMO_DATA_CONFIRMED === 'YES_TEST_DATA_ONLY' &&
    Boolean(id) && id===getDefaultPracticeId() &&
    (process.env.ZIPBOOK_DEMO_RESET_ALLOWED_IDS || '').split(',').map(v=>v.trim()).includes(id);
}
export function isRealDemoTenant() {
  const tenant=currentTenant();
  return realDemoConfigured() && tenant.legacy && tenant.practiceId===demoAllowedId();
}

const DEMO_TTL_SECONDS = 15 * 60;
const noStore = {'Cache-Control':'private, no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow'};

function envReady() {
  return process.env.ZIPBOOK_PUBLIC_DEMO_ENABLED === '1' &&
    (process.env.ZIPBOOK_DEMO_TURNSTILE_SITE_KEY || '').length > 8 &&
    (process.env.ZIPBOOK_DEMO_TURNSTILE_SECRET_KEY || '').length > 8 &&
    (process.env.ZIPBOOK_DEMO_SESSION_SECRET || '').length >= 32;
}

export function isPublicDemoEnabled() {return envReady();}

export function demoHostAllowed(request:NextRequest) {
  const host=(request.headers.get('host') || '').split(':')[0].toLowerCase();
  return host === 'zipbook.app' || host === 'www.zipbook.app' || host === 'admin.zipbook.app' ||
    (process.env.NODE_ENV !== 'production' && (host === 'localhost' || host === '127.0.0.1'));
}

export function demoStartHostAllowed(request:NextRequest) {
  const host=(request.headers.get('host')||'').split(':')[0].toLowerCase();
  return host==='zipbook.app' || host==='www.zipbook.app' || (process.env.NODE_ENV!=='production' && ['localhost','127.0.0.1'].includes(host));
}

export function demoJson(data:unknown,status=200) {
  return NextResponse.json(data,{status,headers:noStore});
}

export function requireDemoOrigin(request:NextRequest) {
  if(!demoHostAllowed(request)) return false;
  const origin=request.headers.get('origin') || '';
  try {
    const parsed=new URL(origin);
    const hostname=request.headers.get('host')?.toLowerCase();
    return parsed.host.toLowerCase()===hostname &&
      (parsed.protocol==='https:' || (process.env.NODE_ENV!=='production' && parsed.protocol==='http:')) &&
      (request.headers.get('content-type')||'').toLowerCase().startsWith('application/json');
  } catch {return false;}
}

function secret() {return process.env.ZIPBOOK_DEMO_SESSION_SECRET || '';}
export function issueDemoToken(now=Date.now()) {
  if(!envReady()) throw new Error('Demo access is not configured.');
  return issuePublicDemoSession(secret(),now);
}
export function verifyDemoToken(token:string,now=Date.now()) {
  if(!envReady()) return null;
  return readPublicDemoSession(secret(),token,now);
}
export function demoCookieOn(response:NextResponse,token:string) {
  response.cookies.set(DEMO_COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',domain:process.env.NODE_ENV==='production'?DEMO_DOMAIN:undefined,maxAge:DEMO_TTL_SECONDS});
}
export function demoCookieOff(response:NextResponse) {
  response.cookies.set(DEMO_COOKIE,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',domain:process.env.NODE_ENV==='production'?DEMO_DOMAIN:undefined,maxAge:0});
}
export function getDemoSession(request:NextRequest) {
  if(!demoHostAllowed(request)) return null;
  return verifyDemoToken(request.cookies.get(DEMO_COOKIE)?.value||'');
}

function requestIp(request:NextRequest) {
  const netlify=(request.headers.get('x-nf-client-connection-ip')||'').trim();
  const cloudflare=(request.headers.get('cf-connecting-ip')||'').trim();
  const forwarded=(request.headers.get('x-forwarded-for')||'').split(',')[0].trim();
  const raw=netlify||cloudflare||forwarded||'missing';
  return raw.slice(0,64);
}

export async function demoRateCheck(request:NextRequest) {
  const fingerprint=createHash('sha256').update(`zipbook-public-demo:${secret()}:${requestIp(request)}`).digest('hex');
  const result=await platformTransaction(async client=>(await client.query<{attempts:number}>(`
    INSERT INTO public.zipbook_public_demo_attempts(fingerprint,window_start,attempts)
    VALUES($1,now(),1)
    ON CONFLICT (fingerprint) DO UPDATE SET
      attempts=CASE WHEN zipbook_public_demo_attempts.window_start < now()-interval '1 hour' THEN 1 ELSE LEAST(zipbook_public_demo_attempts.attempts+1,100) END,
      window_start=CASE WHEN zipbook_public_demo_attempts.window_start < now()-interval '1 hour' THEN now() ELSE zipbook_public_demo_attempts.window_start END
    RETURNING attempts`,[fingerprint])).rows[0]);
  return (result?.attempts ?? 100)<=6;
}

export async function verifyDemoChallenge(request:NextRequest,token:string) {
  if(!envReady() || !token || token.length>2048) return false;
  const data=new URLSearchParams({secret:process.env.ZIPBOOK_DEMO_TURNSTILE_SECRET_KEY||'',response:token});
  const ip=requestIp(request);
  if(ip!=='missing') data.set('remoteip',ip);
  try {
    const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:data,headers:{'Content-Type':'application/x-www-form-urlencoded'},cache:'no-store',signal:AbortSignal.timeout(8000)
    });
    if(!response.ok) return false;
    const payload=await response.json() as {success?:boolean;action?:string;hostname?:string};
    const requestedHost=(request.headers.get('host')||'').split(':')[0].toLowerCase();
    return payload.success===true && payload.action==='zipbook_demo' && payload.hostname?.toLowerCase()===requestedHost;
  } catch {return false;}
}

export function publicDemoSiteKey() {return envReady()?process.env.ZIPBOOK_DEMO_TURNSTILE_SITE_KEY||'':'';}


// Demo visitors can only use real diary appointments and read fictional customer
// records. No settings, staff management, audit, password reset or platform APIs.
export function demoDiaryApiPermitted(path:string,method:string) {
  if(method==='GET' && (path==='/api/bootstrap' || path==='/api/bookings' || path==='/api/customers' || path==='/api/admin-data/customers' ||
    path==='/api/admin-data/booking-alerts' || /^\/api\/admin-data\/customers\/[^/]+$/.test(path))) return true;
  if(path==='/api/bookings' && method==='POST') return true;
  if(/^\/api\/bookings\/[^/]+$/.test(path) && (method==='PATCH'||method==='DELETE')) return true;
  return false;
}

export function demoVirtualStaff() {
  const time=new Date().toISOString();
  return {id:'demo-reception',fullName:'Demo Reception',email:'demo@example.invalid',phone:'',role:'Demo / Reception',active:true,createdAt:time,updatedAt:time};
}

export function requireDemoWriteOrigin(request:NextRequest) {
  const origin=request.headers.get('origin')||'';
  const target=request.headers.get('host')||'';
  if(!origin) return request.headers.get('sec-fetch-site')==='same-origin';
  try {
    const url=new URL(origin);
    return url.host.toLowerCase()===target.toLowerCase() &&
      (url.protocol==='https:' || (process.env.NODE_ENV!=='production' && url.protocol==='http:'));
  } catch {return false;}
}

// Shared database rate limiter, keyed to the signed visitor token, not client-supplied IDs.
export async function demoActionRateCheck(request:NextRequest) {
  const token=request.cookies.get(DEMO_COOKIE)?.value||'';
  if(!getDemoSession(request) || !token) return false;
  const fingerprint=createHash('sha256').update(`zipbook-real-demo-action:${secret()}:${token}`).digest('hex');
  const result=await platformTransaction(async client=>(await client.query<{attempts:number}>(`
    INSERT INTO public.zipbook_public_demo_attempts(fingerprint,window_start,attempts)
    VALUES($1,now(),1)
    ON CONFLICT (fingerprint) DO UPDATE SET
      attempts=CASE WHEN zipbook_public_demo_attempts.window_start < now()-interval '15 minutes' THEN 1 ELSE LEAST(zipbook_public_demo_attempts.attempts+1,100) END,
      window_start=CASE WHEN zipbook_public_demo_attempts.window_start < now()-interval '15 minutes' THEN now() ELSE zipbook_public_demo_attempts.window_start END
    RETURNING attempts`,[fingerprint])).rows[0]);
  return (result?.attempts ?? 100)<=20;
}
