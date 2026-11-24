import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {issuePublicDemoSession,readPublicDemoSession,DEMO_SESSION_SECONDS} from '../lib/publicDemoSession.mjs';
const source=rel=>readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');

test('signed public demo access lasts 30 minutes, not 15',()=>{
  assert.equal(DEMO_SESSION_SECONDS,1800);
  const secret='a'.repeat(40),now=Date.UTC(2026,10,24,12,0);
  const token=issuePublicDemoSession(secret,now);
  assert.ok(readPublicDemoSession(secret,token,now+1799000));
  assert.equal(readPublicDemoSession(secret,token,now+1801000),null);
  assert.match(source('lib/publicDemoAuth.ts'),/DEMO_TTL_SECONDS = 30 \* 60/);
});

test('first attempt requires Turnstile; another session requires verified email',()=>{
  const start=source('app/api/demo/start/route.ts');
  assert.match(start,/verifyDemoChallenge\(request,body.challenge\)/);
  assert.match(start,/beginPublicDemoVisit\(request\)/);
  assert.match(start,/result==='verify-email'/);
  assert.match(start,/requiresVerification:true/);
  assert.match(start,/demoCookieOn\(response,issueDemoToken\(\)\)/);
  const access=source('lib/publicDemoAccess.ts');
  assert.match(access,/sessions_granted=1/);
  assert.match(access,/Number\(row.sessions_granted\)===0/);
  assert.match(access,/SELECT sessions_granted,sessions_today,daily_window_start FROM public.zipbook_public_demo_visitors WHERE fingerprint=\$1 FOR UPDATE/);
  assert.match(access,/challenge_passed_until=now\(\)\+interval '10 minutes'/);
  assert.match(access,/x-nf-client-connection-ip/);
  assert.doesNotMatch(access,/request.nextUrl.searchParams.get\('ip'/);
});

test('repeat visitor collects first name surname phone email and explicit consent',()=>{
  const page=source('app/demo/page.tsx');
  assert.match(page,/setStage\('contact'\)/);
  for(const name of ['firstName','surname','phone','email','consent'])assert.match(page,new RegExp(name));
  const route=source('app/api/demo/request-code/route.ts');
  assert.match(route,/body.consent!==true/);
  const access=source('lib/publicDemoAccess.ts');
  assert.match(access,/validateContact\(body\)/);
  assert.match(access,/^.*pending_first_name=\$2,pending_surname=\$3,pending_phone=\$4,pending_email=\$5/m);
  assert.match(access,/^\s*if\(!\/\^\\\+\[1-9\]/m);
});

test('repeat access only granted after one-time email code is verified',()=>{
  const codeRoute=source('app/api/demo/request-code/route.ts');
  const verify=source('app/api/demo/verify-code/route.ts');
  const access=source('lib/publicDemoAccess.ts');
  assert.match(codeRoute,/requestPublicDemoExtensionCode\(request,body\)/);
  assert.doesNotMatch(codeRoute,/demoCookieOn/);
  assert.match(access,/sendZipBookEmail/);
  assert.match(access,/result.delivered/);
  assert.match(access,/createHmac\('sha256',secret\(\)\)/);
  assert.match(access,/timingSafeEqual/);
  assert.match(access,/Number\(row.otp_attempts\)>=5/);
  assert.match(access,/otp_attempts=otp_attempts\+1/);
  assert.match(access,/otp_hash=null,otp_expires_at=null/);
  assert.match(verify,/if\(!verified\)return demoJson\(\{error:'That code was not correct.'/);
  assert.match(verify,/demoCookieOn\(response,issueDemoToken\(\)\)/);
});

test('abuse controls use a hashed IP, daily session ceiling and email resend restrictions',()=>{
  const access=source('lib/publicDemoAccess.ts');
  assert.match(access,/MAX_SESSIONS_PER_DAY=4/);
  assert.match(access,/MAX_CODES_PER_DAY=4/);
  assert.match(access,/createHash\('sha256'\)/);
  assert.match(access,/otp_window_start/);
  assert.match(access,/60000/);
  assert.match(access,/86400000/);
  assert.match(access,/FOR UPDATE/);
  const sql=source('supabase/zipbook_demo_repeat_ver_0_063_8.sql');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public.zipbook_public_demo_visitors/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public.zipbook_public_demo_visitors/);
  assert.match(sql,/fingerprint text PRIMARY KEY/);
});

test('demo customer can use the genuine account signup/login and cannot access unrelated account APIs',()=>{
  const tenant=source('lib/tenantRequest.ts');
  for(const route of ['/api/client-login/login','/api/client-login/sign-up/request-code','/api/client-login/sign-up/verify','/api/client-login/bookings'])assert.ok(tenant.includes(route));
  assert.match(tenant,/getDemoSession\(request\)/);
  assert.match(tenant,/requireDemoWriteOrigin/);
  assert.match(tenant,/demoActionRateCheck/);
  assert.doesNotMatch(tenant,/Public demo visitors receive an automatic temporary customer account/);
  const db=source('lib/db.ts');
  assert.match(db,/!currentTenant\(\).legacy \|\| isActiveRealDemoRequest\(\)/);
  assert.match(db,/provider:'demo-no-email'/);
  assert.match(db,/provider:'demo-no-push'/);
  const page=source('app/book/page.tsx');
  assert.doesNotMatch(page,/demoAccount/);
  assert.match(page,/clientLoginOpen &&/);
});
