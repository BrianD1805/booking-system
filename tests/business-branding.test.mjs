import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateLogoMetadata,logoIconUrl,businessManifest,MAX_LOGO_UPLOAD_BYTES} from '../lib/brandingPolicy.mjs';
const read = name => readFileSync(new URL(`../${name}`,import.meta.url),'utf8');

test('image inputs allow safe static formats within capped dimensions and size',()=>{
  for(const format of ['png','jpeg','webp']) assert.equal(validateLogoMetadata({format,width:512,height:512,pages:1},10000),true);
  for(const format of ['svg','gif','tiff','pdf','heif']) assert.throws(()=>validateLogoMetadata({format,width:512,height:512},10000));
  for(const dimensions of [[0,512],[127,512],[4000,5000]]) assert.throws(()=>validateLogoMetadata({format:'png',width:dimensions[0],height:dimensions[1]},10000));
  assert.throws(()=>validateLogoMetadata({format:'png',width:512,height:512,pages:2},10000));
  assert.throws(()=>validateLogoMetadata({format:'png',width:512,height:512},MAX_LOGO_UPLOAD_BYTES+1));
});

test('PWA icon URLs and manifest are business-specific, scope stays /book and defaults safely',()=>{
  const version='0b15240a-10a1-4a12-a321-bacecddf0000';
  const demo=businessManifest('Demo Dental',version);
  const other=businessManifest('Other Practice',null);
  assert.equal(demo.start_url,'/book');assert.equal(demo.scope,'/book');assert.equal(demo.id,'/book');
  assert.match(demo.name,/Demo Dental/);assert.deepEqual(demo.icons.map(i=>i.sizes),['192x192','512x512']);
  assert.match(demo.icons[0].src,/size=192&v=0b15240a/);
  assert.equal(other.icons[0].src,'/icons/icon-192.png');
  assert.equal(other.icons[1].src,'/icons/icon-512.png');
  assert.equal(logoIconUrl(180,undefined),'/apple-touch-icon.png');
  assert.throws(()=>logoIconUrl(32,version));
  assert.doesNotMatch(businessManifest('<script>alert(1)</script>',null).icons[0].src,/script/);
});

test('branding endpoints require tenant scope, owner authorization and same-origin writes',()=>{
  const owner=read('app/api/admin-branding/route.ts');
  assert.match(owner,/withTenantRequest\(/);assert.match(owner,/requireBusinessOwner\(request\)/);
  assert.match(owner,/permittedIntegrationWriteOrigin\(/);assert.match(owner,/tenant\.host/);
  assert.match(owner,/localHost=!production/);
  assert.match(owner,/request\.headers\.get\('host'\)/);assert.match(owner,/validateLogoMetadata\(/);
  assert.match(owner,/currentTenant\(\)/);assert.match(owner,/logo_data/);
  assert.doesNotMatch(owner,/request\.nextUrl\.origin/);
  for(const path of ['app/api/branding/route.ts','app/api/branding/manifest/route.ts','app/api/branding/icon/route.ts']) {
    assert.match(read(path),/withTenantRequest\(/);
  }
  const db=read('lib/businessBranding.ts');assert.match(db,/practice_id=\$\{currentTenant\(\)\.practiceId\}/);
  const sql=read('supabase/zipbook_business_branding_ver_0_060.sql');
  assert.match(sql,/ROW LEVEL SECURITY/);assert.match(sql,/AS RESTRICTIVE/);
  assert.match(sql,/zipbook\.practice_id/);assert.match(sql,/bytea/);
});

test('booking page and installed app use the same versioned tenant logo and default ZipBook fallback',()=>{
  const page=read('app/book/page.tsx');
  const layout=read('app/book/layout.tsx');
  assert.match(page,/\/api\/branding/);
  assert.match(page,/businessLogoVersion/);
  assert.match(page,/bookingLogo/);assert.match(page,/headerLogo/);
  assert.match(layout,/manifest: '\/api\/branding\/manifest'/);
  assert.match(layout,/size=180/);
  assert.match(page,/ClientInstallPrompt businessName=/);
  assert.match(read('app/book/ClientInstallPrompt.tsx'),/Install \{installName\}/);
  assert.match(read('app/api/branding/icon/route.ts'),/new Uint8Array\(output\)/);
  assert.doesNotMatch(read('proxy.ts'),/import.*businessBranding/);
});
