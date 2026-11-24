import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInTenant,isVerifiedDemoRequestContext} from '../lib/tenantScope.mjs';
import {issuePublicDemoSession,readPublicDemoSession} from '../lib/publicDemoSession.mjs';
const src=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the same practice can serve ordinary requests without inheriting demo restrictions',async()=>{
  const future=new Date(Date.now()+15*60*1000).toISOString();
  const normal=await runInTenant({practiceId:'practice_001',legacy:true,demoVisitor:false,demoExpiresAt:null},async()=>isVerifiedDemoRequestContext());
  const demo=await runInTenant({practiceId:'practice_001',legacy:true,demoVisitor:true,demoExpiresAt:future},async()=>isVerifiedDemoRequestContext());
  assert.equal(normal,false);
  assert.equal(demo,true);
});

test('demo capability requires a verified, unexpired signing token',async()=>{
  const secret='s'.repeat(48),now=Date.now();
  const signed=issuePublicDemoSession(secret,now);
  const accepted=readPublicDemoSession(secret,signed,now);
  assert.ok(accepted?.expiresAt);
  const rejected=readPublicDemoSession(secret,signed,now+31*60*1000);
  assert.equal(rejected,null);
  assert.equal(await runInTenant({practiceId:'practice_001',demoVisitor:true,demoExpiresAt:new Date(now-1000).toISOString()},async()=>isVerifiedDemoRequestContext(now)),false);
  assert.equal(await runInTenant({practiceId:'practice_001',demoVisitor:true,demoExpiresAt:accepted.expiresAt},async()=>isVerifiedDemoRequestContext(now)),true);
});

test('host/tenant selection is independent of the signed demo session',()=>{
  const source=src('lib/tenantRequest.ts');
  assert.match(source,/lookupTenant\(host.kind === 'legacy'/);
  assert.match(source,/host.kind === 'legacy' \? getDemoSession\(request\) : null/);
  assert.match(source,/demoVisitor: Boolean\(verifiedDemo\)/);
  assert.match(source,/demoExpiresAt: verifiedDemo\?\.expiresAt \?\? null/);
  assert.match(source,/if\(isActiveRealDemoRequest\(\)\)/);
  assert.doesNotMatch(source,/if\(isRealDemoTenant\(\)\)\s*\{/);
  assert.match(src('lib/publicDemoAuth.ts'),/isRealDemoTenant\(\) && isVerifiedDemoRequestContext\(\)/);
});

test('ordinary public requests keep their original sign-up and notification behaviour',()=>{
  const db=src('lib/db.ts');
  const signup=src('app/api/client-login/sign-up/request-code/route.ts');
  const all=db.match(/isActiveRealDemoRequest\(\)/g)||[];
  assert.ok(all.length>=7,`expected all demo-specific DB paths to be scoped, saw ${all.length}`);
  assert.doesNotMatch(db,/isRealDemoTenant\(\)/);
  assert.match(db,/if\(isActiveRealDemoRequest\(\)\) return \{attempted:false,delivered:false,provider:'demo-no-email'/);
  assert.match(db,/if\(isActiveRealDemoRequest\(\)\) return \{attempted:false,delivered:0,failed:0,configured:false,provider:'demo-no-push'/);
  assert.match(signup,/isActiveRealDemoRequest\(\) && !isEmailProviderConfigured\(\)/);
  assert.doesNotMatch(signup,/isRealDemoTenant\(\)/);
});

test('demo account sessions end with the demo; normal account sessions remain 30 days',()=>{
  const db=src('lib/db.ts');
  const begin=db.indexOf('async function createClientSession(');
  const end=db.indexOf('function mapPractice(',begin);
  const session=db.slice(begin,end);
  assert.ok(begin>=0 && end>begin);
  assert.match(session,/if \(isActiveRealDemoRequest\(\)\)/);
  assert.match(session,/const demoExpiresAt = currentTenant\(\)\.demoExpiresAt/);
  assert.match(session,/\$\{demoExpiresAt\}::timestamptz/);
  assert.match(session,/NOW\(\) \+ INTERVAL '30 days'/);
});

test('the diary demo capability still needs a signed cookie and is deny-by-default',()=>{
  const guard=src('lib/adminStaffAuth.ts');
  assert.match(guard,/isRealDemoTenant\(\) && getDemoSession\(request\)/);
  assert.match(guard,/demoDiaryApiPermitted\(request.nextUrl.pathname,request.method\)/);
  assert.match(guard,/Demo access cannot change protected settings/);
  const acl=src('lib/publicDemoAuth.ts');
  assert.ok(!acl.slice(acl.indexOf('export function demoDiaryApiPermitted'),acl.indexOf('export function demoVirtualStaff')).includes('/api/admin-settings'));
});
