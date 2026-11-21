import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normaliseWebsiteOrigin, frameAncestorsForDomains, businessEmbedUrls, bookingHtmlSnippet, adminHtmlSnippet, reactEmbedSnippet, safeRemoteFramePolicy, permittedIntegrationWriteOrigin} from '../lib/embedPolicy.mjs';
const read = name => readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
test('website owner may register exact HTTPS origins only',()=>{
  assert.equal(normaliseWebsiteOrigin(' HTTPS://WWW.Example.ORG/ '),'https://www.example.org');
  for (const origin of ['http://example.org','https://example.org/path','https://example.org/?a=1','https://example.org/#test','https://user@example.org','https://*.example.org','https://localhost','https://127.0.0.1','https://www.example.org:8080','https://example.org.evil.test/path','javascript:alert(1)','https://zipbook.app','https://foo.zipbook.app','https://example.org\\evil']) {
    assert.throws(()=>normaliseWebsiteOrigin(origin),origin);
  }
});
test('website owner POST Origin is checked against verified tenant Host, not the internal Netlify request URL',()=>{
  const allow = (origin, host='demo-dental.zipbook.app', tenant='demo-dental.zipbook.app', prod=true) => permittedIntegrationWriteOrigin(origin,host,tenant,prod);
  assert.equal(allow('https://demo-dental.zipbook.app'),true);
  // In production the NextRequest URL may be internal; it is intentionally not
  // accepted as authority for the CSRF comparison.
  assert.equal(allow('https://bookings-system.netlify.app'),false);
  assert.equal(allow('https://demo-dental.zipbook.app','different.zipbook.app'),false);
  assert.equal(allow('https://other.zipbook.app'),false);
  assert.equal(allow('http://demo-dental.zipbook.app'),false);
  assert.equal(allow('https://demo-dental.zipbook.app:8443','demo-dental.zipbook.app:8443'),false);
  assert.equal(allow('https://demo-dental.zipbook.app.evil.test'),false);
  assert.equal(allow('https://demo-dental.zipbook.app/path'),false);
  assert.equal(allow('https://demo-dental.zipbook.app/'),false);
  assert.equal(allow('https://user@demo-dental.zipbook.app'),false);
  assert.equal(allow('null'),false);
  assert.equal(allow(null),false);
  assert.equal(allow('https://demo-dental.zipbook.app','demo-dental.zipbook.app.evil.test'),false);
  assert.equal(allow('http://demo-dental.localhost:8888','demo-dental.localhost:8888','demo-dental.localhost',false),true);
  assert.equal(allow('http://demo-dental.localhost:9999','demo-dental.localhost:8888','demo-dental.localhost',false),false);
});

test('integration POST route uses tenant-bound Origin validation without bypassing owner authentication',()=>{
  const route=read('app/api/admin-integrations/route.ts');
  assert.match(route,/requireBusinessOwner\(request\)/);
  assert.match(route,/permittedIntegrationWriteOrigin\(/);
  assert.match(route,/tenant\.host/);
  assert.match(route,/request\.headers\.get\('host'\)/);
  assert.doesNotMatch(route,/request\.nextUrl\.origin/);
  assert.match(route,/application\/json/);
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
  assert.match(route,/permittedIntegrationWriteOrigin/);assert.match(route,/normaliseWebsiteOrigin/);assert.match(route,/action==='remove'/);
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/);assert.match(migration,/AS RESTRICTIVE/);
  assert.match(migration,/zipbook\.practice_id/);assert.match(migration,/zipbook_tenant_runtime/);
});
test('frame CSP uses database-approved origins and rejects failures',()=>{
  const proxy=read('proxy.ts');assert.match(proxy,/await websiteFramePolicy/);
  assert.match(proxy,/fetch\(policyUrl/);
  assert.match(proxy,/safeRemoteFramePolicy\(policy\)/);
  assert.doesNotMatch(proxy,/from ['"]\.\/lib\/dbProvider|platformTransaction|from ['"]pg['"]/);
  const api=read('app/api/embed-frame-policy/route.ts');
  assert.match(api,/return withTenantRequest\(request,/);
  assert.match(api,/getZipBookDatabase\(\)/);
  assert.match(api,/frameAncestorsForDomains\(domains,kind\)/);
  assert.match(api,/practice_id = \$\{tenant\.practiceId\}/);
  assert.match(api,/runtime = 'nodejs'/);
  assert.match(proxy,/"frame-ancestors 'none'"/);
  assert.match(proxy,/process\.env\.ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS/);
  assert.match(proxy,/pathname === '\/admin'/);
  assert.match(proxy,/pathname === '\/book'/);
});
test('remote frame policy validation fails closed on unauthorised or malformed responses',()=>{
  const deny = "frame-ancestors 'none'";
  const accept = {policy:'frame-ancestors https://www.example.org https://shop.example.net'};
  assert.equal(safeRemoteFramePolicy(accept),accept.policy);
  for(const input of [null,{}, {policy:''},{policy: 'frame-ancestors *'}, {policy:'frame-ancestors https://evil.org; script-src *'}, {policy:'frame-ancestors http://evil.org'}, {policy:'frame-ancestors https://*.evil.org'}, {policy:'frame-ancestors https://zipbook.app'}, {policy:'frame-ancestors https://evil.org/'},{policy:'frame-ancestors https://evil.org  https://other.org'}, {policy:'frame-ancestors https://evil.org/path'}]){
    assert.equal(safeRemoteFramePolicy(input),deny,JSON.stringify(input));
  }
});
test('proxy-only helpers have TypeScript declarations matching their imported exports',()=>{
  const hostTypes = read('lib/tenantHost.d.mts');
  const hostCode = read('lib/tenantHost.mjs');
  const policyTypes = read('lib/embedPolicy.d.mts');
  const policyCode = read('lib/embedPolicy.mjs');
  assert.match(hostCode,/export function classifyTenantHost\(/);
  assert.match(hostTypes,/export function classifyTenantHost\(/);
  assert.match(policyCode,/export function safeRemoteFramePolicy\(/);
  assert.match(policyTypes,/export function safeRemoteFramePolicy\(/);
});
test('the admin menu exposes only owner access and unauthorised legacy practice stays excluded',()=>{
  const gate=read('components/admin/AdminAuthGate.tsx');
  assert.match(gate,/Website integration/);
  assert.match(gate,/item\.href !== '\/admin\/integrations' \|\| !business\.legacy/);
  assert.match(gate,/canUseAdminSessionStorage\(\)/);
  const marketing=read('app/widget/page.tsx');assert.match(marketing,/website builder/i);
});
