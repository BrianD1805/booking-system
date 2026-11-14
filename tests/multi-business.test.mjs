import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { classifyTenantHost, currentTenant, runInTenant } from '../lib/tenantScope.mjs';
import { hashStaffPassword, verifyStaffPassword } from '../lib/staffPassword.mjs';
const read = name => readFileSync(new URL(`../${name}`,import.meta.url),'utf8');

test('unknown or disabled business never resolves to demo',()=>{
  for (const host of ['spbio.zipbook.app','spbio.localhost','attacker.com','fake.netlify.app','spbio.zipbook.app.attacker.com','two.parts.zipbook.app','mail.zipbook.app','spbio.zipbook.app:443']) assert.equal(classifyTenantHost(host).kind,'unknown');
  assert.equal(classifyTenantHost('zipbook.app').kind,'legacy');
  assert.equal(classifyTenantHost('admin.zipbook.app').kind,'legacy');
});
test('canonical business and local test host resolution',()=>{
  assert.deepEqual(classifyTenantHost('SPBIO.zipbook.app:443',{enabled:true}),{kind:'business',host:'spbio.zipbook.app',slug:'spbio'});
  assert.equal(classifyTenantHost('alpha.localhost:8888',{enabled:true,local:true}).slug,'alpha');
  assert.equal(classifyTenantHost('alpha.localhost:8888',{enabled:true}).kind,'unknown');
  for(const name of ['-alpha.zipbook.app','alpha-.zipbook.app','alpha_2.zipbook.app','www.zipbook.app.evil.test','alpha.zipbook.app,evil.test','platform.zipbook.app']) assert.equal(classifyTenantHost(name,{enabled:true}).kind,'unknown');
});
test('parallel tenant scopes remain independent after asynchronous interleaving',async()=>{
  assert.throws(()=>currentTenant(),/Tenant context required/);
  const a={practiceId:'a',tenantSlug:'alpha',name:'Alpha',host:'alpha.localhost',legacy:false};
  const b={practiceId:'b',tenantSlug:'beta',name:'Beta',host:'beta.localhost',legacy:false};
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const [left,right]=await Promise.all([runInTenant(a,async()=>{await wait(10);assert.equal(currentTenant().practiceId,'a');return currentTenant().tenantSlug;}),runInTenant(b,async()=>{await wait(1); assert.equal(currentTenant().practiceId,'b');return currentTenant().tenantSlug;})]);
  assert.deepEqual([left,right],['alpha','beta']);assert.throws(()=>currentTenant(),/Tenant context required/);
});
test('scrypt password random salts, wrong password rejected, legacy compatibility',()=>{
  const a=hashStaffPassword('correct-password');const b=hashStaffPassword('correct-password');
  assert.notEqual(a,b);assert.equal(verifyStaffPassword('id','correct-password',a),true);assert.equal(verifyStaffPassword('id','wrong-password',a),false);
  const legacy=createHash('sha256').update('zipbook-admin-staff-password:id:old-pass').digest('hex');
  assert.equal(verifyStaffPassword('id','old-pass',legacy),true);assert.equal(verifyStaffPassword('other','old-pass',legacy),false);assert.equal(verifyStaffPassword('id','x','bad'),false);
});
test('every database-backed request handler enters the tenant boundary',()=>{
  const crawl=folder=>readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?crawl(join(folder,e.name)):[join(folder,e.name)]);
  for(const path of crawl(fileURLToPath(new URL('../app/api',import.meta.url))).filter(p=>p.endsWith('route.ts'))){
    const source=readFileSync(path,'utf8');
    for(const match of source.matchAll(/export async function (GET|POST|PATCH|DELETE|PUT)\(request: NextRequest[^\n]*\) \{\s*([^\n]*)/g)) assert.match(match[2],/^return withTenantRequest\(request,/,path);
  }
});
test('database wrapper uses transaction-local role and context, never raw tenant SQL on pool',()=>{
  const s=read('lib/dbProvider.ts');assert.match(s,/BEGIN/);assert.match(s,/SET LOCAL ROLE zipbook_tenant_runtime/);assert.match(s,/set_config\('zipbook.practice_id', \$1, true\)/);assert.match(s,/connection\.query\(query.text, query.values\)/);assert.match(s,/ROLLBACK/);assert.match(s,/connection.release\(discard\)/);assert.doesNotMatch(s,/pool\.query\(query.text/);
});
test('no request-independent bootstrap or settings cache, no constant practice ID',()=>{
  for(const file of ['lib/db.ts','app/api/admin-settings/route.ts']) {const s=read(file);assert.doesNotMatch(s,/const PRACTICE_ID|let cachedBootstrap|let cachedSettings/);assert.match(s,/currentTenant\(\)\.practiceId/);}
});
test('migration includes restrictive RLS and cross-table checks and starts pilots disabled',()=>{
  const s=read('supabase/zipbook_multi_business_ver_0_056.sql');assert.match(s,/pilot_enabled boolean NOT NULL DEFAULT false/);assert.match(s,/NOLOGIN NOSUPERUSER.*NOBYPASSRLS/);assert.match(s,/AS RESTRICTIVE FOR ALL/);assert.match(s,/WITH CHECK \(%s\)/);assert.match(s,/bookings.customer_id/);assert.match(s,/p\.pilot_enabled=true/);assert.match(s,/REVOKE INSERT, UPDATE, DELETE ON public.practices/);
});
test('business staff cannot create first owner or use demo cleanup',()=>{
  const s=read('app/api/admin-auth/staff/route.ts');assert.match(s,/!currentTenant\(\)\.legacy \|\| staffCount > 0/);assert.match(s,/requireBusinessOwner\(request\)/);assert.match(read('lib/adminStaffAuth.ts'),/result.staff.role !== 'Owner'/);assert.match(read('lib/tenantRequest.ts'),/\/api\/admin-data\/bookings\/past/);
});
