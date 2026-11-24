import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {issuePublicDemoSession,readPublicDemoSession} from '../lib/publicDemoSession.mjs';
const source=(file)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('demo uses a single host-resolved real tenant with a second, explicit safety acknowledgement',()=>{
  const policy=source('lib/publicDemoAuth.ts');
  const tenant=source('lib/tenantRequest.ts');
  const route=source('app/api/demo/start/route.ts');
  assert.match(policy,/ZIPBOOK_REAL_DEMO_ENABLED === '1'/);
  assert.match(policy,/YES_TEST_DATA_ONLY/);
  assert.match(policy,/ZIPBOOK_DEMO_RESET_ALLOWED_IDS/);
  assert.match(policy,/id===getDefaultPracticeId\(\)/);
  assert.match(policy,/tenant.legacy && tenant.practiceId===demoAllowedId\(\)/);
  assert.match(tenant,/lookupTenant\(host.kind === 'legacy'/);
  assert.doesNotMatch(tenant,/request.nextUrl.searchParams.get\('tenant'/);
  assert.match(route,/withTenantRequest\(request/);
  assert.match(route,/isRealDemoTenant\(\)/);
  assert.match(route,/verifyDemoChallenge\(request,body.challenge\)/);
});

test('real demo session is signed, limited to 30 minutes and shared across both ZipBook subdomains',()=>{
  const secret='s'.repeat(44);
  const token=issuePublicDemoSession(secret,Date.UTC(2026,10,24));
  assert.ok(readPublicDemoSession(secret,token,Date.UTC(2026,10,24)+30000));
  assert.equal(readPublicDemoSession(secret,token,Date.UTC(2026,10,24)+1801000),null);
  const policy=source('lib/publicDemoAuth.ts');
  assert.match(policy,/host === 'admin.zipbook.app'/);
  assert.match(policy,/DEMO_DOMAIN = 'zipbook.app'/);
  assert.match(policy,/httpOnly:true/);
  assert.match(policy,/sameSite:'lax'/);
  assert.match(policy,/secure:process.env.NODE_ENV==='production'/);
  const status=source('app/api/admin-auth/staff/status/route.ts');
  assert.match(status,/isRealDemoTenant\(\) && getDemoSession\(request\)/);
  assert.match(status,/staff:demoVirtualStaff\(\)/);
  const gate=source('components/admin/AdminAuthGate.tsx');
  assert.match(gate,/fetch\('\/api\/demo\/session'/);
  assert.match(gate,/await checkStatus\('', '', false, true\)/);
});

test('public diary cannot access owner-only or staff-management capabilities',()=>{
  const guard=source('lib/adminStaffAuth.ts');
  const scope=source('lib/publicDemoAuth.ts');
  assert.match(guard,/demoDiaryApiPermitted\(request.nextUrl.pathname,request.method\)/);
  assert.match(guard,/result.staff.role === 'Demo \/ Reception'/);
  assert.match(scope,/\/api\/bookings/);
  assert.doesNotMatch(scope.slice(scope.indexOf('export function demoDiaryApiPermitted'),scope.indexOf('export function demoVirtualStaff')),/\/api\/admin-settings|\/api\/admin-auth\/staff|\/api\/platform/);
  const gate=source('components/admin/AdminAuthGate.tsx');
  assert.match(gate,/\['\/admin','\/admin\/reception','\/admin\/data'\]/);
  assert.match(gate,/Temporary public demo/);
  assert.match(gate,/Protected settings are not available/);
});

test('demo customer app uses real sign-up / login while diary keeps genuine booking routes',()=>{
  const start=source('app/api/demo/start/route.ts');
  const db=source('lib/db.ts');
  const page=source('app/demo/page.tsx');
  assert.doesNotMatch(start,/createTemporaryDemoClient\(\)/);
  assert.match(start,/beginPublicDemoVisit\(request\)/);
  assert.match(page,/href="\/book"/);
  assert.doesNotMatch(page,/demoAccount=signup/);
  assert.match(page,/admin.zipbook.app\/admin\?demo=1/);
  assert.doesNotMatch(page,/initialItems\(/);
  assert.match(db,/requestClientSignupOtp/);
  assert.match(db,/verifyClientSignupOtp/);
  assert.match(source('app/api/bookings/route.ts'),/createBookingInDatabase/);
  assert.match(source('app/api/bookings/route.ts'),/getBookings\(date\)/);
});

test('no master key leak, with OTP email verification but no demo booking email or push abuse',()=>{
  const page=source('app/demo/page.tsx');
  const db=source('lib/db.ts');
  const tenant=source('lib/tenantRequest.ts');
  assert.doesNotMatch(page,/x-zipbook-admin-key|ZIPBOOK_ADMIN_DATA_KEY|ZIPBOOK_PLATFORM_KEY/);
  assert.match(tenant,/path.startsWith\('\/api\/client-login\/'\)/);
  assert.match(tenant,/isActiveRealDemoRequest\(\)/);
  assert.match(db,/provider:'demo-no-email'/);
  assert.match(db,/provider:'demo-no-push'/);
  assert.match(page,/appointment notification emails and push alerts are disabled/);
});

test('visitor actions are CSRF protected, DB rate limited, and stop when the signed session expires',()=>{
  const runtime=source('lib/publicDemoAuth.ts');
  const tenant=source('lib/tenantRequest.ts');
  assert.match(runtime,/zipbook_real-demo-action|zipbook-real-demo-action/);
  assert.match(runtime,/zipbook_public_demo_attempts/);
  assert.match(runtime,/<=20/);
  assert.match(runtime,/requireDemoWriteOrigin/);
  assert.match(tenant,/demoActionRateCheck\(request\)/);
  assert.match(tenant,/getDemoSession\(request\)/);
  const sql=source('supabase/zipbook_real_demo_ver_0_063_6.sql');
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL/);
  assert.match(sql,/zipbook_tenant_runtime/);
});

test('demo diary privilege checks are deny-by-default for actual HTTP methods and paths',async()=>{
  const vm=await import('node:vm');
  const runtime=source('lib/publicDemoAuth.ts');
  const start=runtime.indexOf('export function demoDiaryApiPermitted(');
  const end=runtime.indexOf('export function demoVirtualStaff()',start);
  assert.ok(start>0 && end>start);
  const fn=vm.runInNewContext(`${runtime.slice(start,end).replace('export function','function').replace('path:string,method:string','path,method')}\ndemoDiaryApiPermitted`);
  for(const [path,method] of [
    ['/api/bootstrap','GET'],['/api/bookings','GET'],['/api/bookings','POST'],
    ['/api/bookings/bk-001','PATCH'],['/api/bookings/bk-001','DELETE'],
    ['/api/customers','GET'],['/api/admin-data/customers','GET'],
    ['/api/admin-data/customers/cust-001','GET'],['/api/admin-data/booking-alerts','GET']
  ]) assert.equal(fn(path,method),true,`${method} ${path} should be available`);
  for(const [path,method] of [
    ['/api/admin-settings','GET'],['/api/admin-settings','PATCH'],
    ['/api/admin-auth/staff','POST'],['/api/admin-auth/audit','GET'],
    ['/api/platform/demo-reset','DELETE'],['/api/admin-integrations','GET'],
    ['/api/admin-branding','PATCH'],['/api/admin-data/customers','POST'],
    ['/api/admin-data/customers/cust-001','DELETE'],['/api/admin-data/bookings/past','DELETE'],
    ['/api/admin-data/push-subscription','POST'],['/api/bookings','PUT'],['/api/client-login/login','POST']
  ]) assert.equal(fn(path,method),false,`${method} ${path} must be denied`);
});
