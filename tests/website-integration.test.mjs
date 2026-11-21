import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normaliseWebsiteOrigin, frameAncestorsForDomains, businessEmbedUrls, bookingHtmlSnippet, adminHtmlSnippet, reactEmbedSnippet} from '../lib/embedPolicy.mjs';
const read = name => readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
test('website owner may register exact HTTPS origins only',()=>{
  assert.equal(normaliseWebsiteOrigin(' HTTPS://WWW.Example.ORG/ '),'https://www.example.org');
  for (const origin of ['http://example.org','https://example.org/path','https://example.org/?a=1','https://example.org/#test','https://user@example.org','https://*.example.org','https://localhost','https://127.0.0.1','https://www.example.org:8080','https://example.org.evil.test/path','javascript:alert(1)','https://zipbook.app','https://foo.zipbook.app','https://example.org\\evil']) {
    assert.throws(()=>normaliseWebsiteOrigin(origin),origin);
  }
});
test('default frame policy is deny and permissions stay separate',()=>{
  const domains=[{origin:'https://one.example.org',public_embed_enabled:true,admin_embed_enabled:false},{origin:'https://two.example.org',public_embed_enabled:false,admin_embed_enabled:true}];
  assert.equal(frameAncestorsForDomains([], 'public'),"frame-ancestors 'none'");
  assert.equal(frameAncestorsForDomains(domains,'public'),'frame-ancestors https://one.example.org');
  assert.equal(frameAncestorsForDomains(domains,'admin'),'frame-ancestors https://two.example.org');
  assert.equal(frameAncestorsForDomains([{origin:'https://*.example.org',public_embed_enabled:true}], 'public'),"frame-ancestors 'none'");
});
test('one business cannot substitute a different business in a generated code snippet',()=>{
  assert.deepEqual(businessEmbedUrls('demo-dental'),{booking:'https://demo-dental.zipbook.app/book',diary:'https://demo-dental.zipbook.app/admin'});
  for(const slug of ['admin','../admin','foo.example','ABC','foo\" onload=alert(1)']) assert.throws(()=>businessEmbedUrls(slug));
  assert.match(bookingHtmlSnippet('demo-dental'),/https:\/\/demo-dental\.zipbook\.app\/book/);
  assert.match(adminHtmlSnippet('demo-dental'),/target="_blank" rel="noopener noreferrer"/);
  assert.match(reactEmbedSnippet('demo-dental','public'),/referrerPolicy=/);
  assert.doesNotMatch(adminHtmlSnippet('demo-dental'),/token=|password=|admin-key/);
});
test('owner-only integration routes are tenant scoped, with a database RLS policy',()=>{
  const route=read('app/api/admin-integrations/route.ts'),migration=read('supabase/zipbook_website_integration_ver_0_058.sql');
  assert.match(route,/withTenantRequest/);assert.match(route,/requireBusinessOwner/);assert.match(route,/tenant\.practiceId/);
  assert.match(route,/originHeader/);assert.match(route,/normaliseWebsiteOrigin/);assert.match(route,/action==='remove'/);
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/);assert.match(migration,/AS RESTRICTIVE/);
  assert.match(migration,/zipbook\.practice_id/);assert.match(migration,/zipbook_tenant_runtime/);
});
test('frame CSP uses database-approved origins and rejects failures',()=>{
  const proxy=read('proxy.ts');assert.match(proxy,/await websiteFramePolicy/);
  assert.match(proxy,/frameAncestorsForDomains\(rows,kind\)/);
  assert.match(proxy,/p\.pilot_enabled=true/);
  assert.match(proxy,/"frame-ancestors 'none'"/);
  assert.match(proxy,/process\.env\.ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS/);
  assert.match(proxy,/pathname === '\/admin'/);
  assert.match(proxy,/pathname === '\/book'/);
});
test('the admin menu exposes only owner access and unauthorised legacy practice stays excluded',()=>{
  const gate=read('components/admin/AdminAuthGate.tsx');
  assert.match(gate,/Website integration/);
  assert.match(gate,/item\.href !== '\/admin\/integrations' \|\| !business\.legacy/);
  assert.match(gate,/canUseAdminSessionStorage\(\)/);
  const marketing=read('app/widget/page.tsx');assert.match(marketing,/website builder/i);
});
