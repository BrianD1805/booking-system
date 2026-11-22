import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessBusinessReadiness} from '../lib/platformReadinessPolicy.mjs';
const read=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const good={verified_at:'2026-11-21T12:00:00Z',active_owners:1,pilot_enabled:true,configured_practitioners:1,onboarding_completed:false,public_embed_sites:1,admin_embed_sites:1,has_logo:true};
test('readiness separates required setup from deliberately disabled public bookings',()=>{
  const result=assessBusinessReadiness(good,{status:'pass',checkedTables:9});
  assert.equal(result.requiredActions,0);
  assert.equal(result.readyForManualReview,true);
  assert.equal(result.checks.find(c=>c.key==='booking').status,'manual');
  assert.equal(result.checks.find(c=>c.key==='isolation').status,'pass');
});
test('unverified or suspended businesses cannot be marked ready',()=>{
  const missing=assessBusinessReadiness({...good,verified_at:null,active_owners:0,pilot_enabled:false,configured_practitioners:0},{status:'unavailable'});
  assert.equal(missing.readyForManualReview,false);
  for(const key of ['invitation','owner','diary','practitioners','isolation'])assert.equal(missing.checks.find(c=>c.key===key).status,'action');
});
test('a failed isolation audit blocks readiness even if setup is complete',()=>{
  const broken=assessBusinessReadiness(good,{status:'failed',checkedTables:8});
  assert.equal(broken.readyForManualReview,false);
  assert.equal(broken.checks.find(c=>c.key==='isolation').status,'action');
});
test('website permissions and branding are optional for an otherwise configured practice',()=>{
  const result=assessBusinessReadiness({...good,public_embed_sites:0,admin_embed_sites:0,has_logo:false},{status:'pass',checkedTables:9});
  assert.equal(result.requiredActions,0);
  for(const key of ['logo','publicEmbed','staffEmbed'])assert.equal(result.checks.find(c=>c.key===key).status,'manual');
});
test('platform readiness route requires operator key and validates practice ID',()=>{
  const route=read('app/api/platform/readiness/route.ts');
  assert.match(route,/return withPlatformRequest\(request,true,/);
  assert.match(route,/\^practice-\[0-9a-f-\]\{36\}\$/);
  assert.match(route,/getBusinessReadiness\(id\)/);
  assert.doesNotMatch(route,/withTenantRequest/);
});
test('live isolation audit is role-scoped, read-only, cross-practice and policy-checked',()=>{
  const source=read('lib/platformReadiness.ts');
  assert.match(source,/SET TRANSACTION READ ONLY/);
  assert.match(source,/SET LOCAL ROLE zipbook_tenant_runtime/);
  assert.match(source,/set_config\('zipbook\.practice_id'/);
  assert.match(source,/current_user AS active_role/);
  assert.match(source,/pg_catalog\.pg_policy/);
  assert.match(source,/pol\.polpermissive=false/);
  assert.match(source,/foreign_visible/);
  assert.match(source,/\[\[sourceId,other\.id\],\[other\.id,sourceId\]\]/);
  assert.match(source,/auditIsolation\(id\)/);
  assert.doesNotMatch(source,/UPDATE public\.|DELETE FROM public\.|INSERT INTO public\./);
});
