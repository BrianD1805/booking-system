import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url));
test('new PNG icon family has correct dimensions',()=>{
 for(const n of [16,32,48,72,96,128,144,152,180,192,256,384,512]){
  const b=read(`public/icons/icon-${n}.png`);assert.equal(b.readUInt32BE(16),n);assert.equal(b.readUInt32BE(20),n);
 }
 for(const n of [192,512]) {const b=read(`public/icons/maskable-${n}.png`);assert.equal(b.readUInt32BE(16),n);assert.equal(b.readUInt32BE(20),n);}
});
test('legacy image and PWA use packaged assets; other tenants retain uploaded logos',()=>{
 assert.match(read('app/api/branding/icon/route.ts').toString(),/currentTenant\(\)\.legacy \? null : await getLogoData\(\)/);
 assert.match(read('app/api/branding/manifest/route.ts').toString(),/tenant\.legacy \? null : await getLogoVersion\(\)/);
});
test('booking home colour changes preserve existing controls',()=>{
 const css=read('app/globals.css').toString();
 assert.match(css,/\.client-home-welcome::before \{[^}]*rgba\(137, 82, 205, 0.16\)/);
 assert.match(css,/\.client-home-welcome::after \{[^}]*rgba\(51, 102, 153, 0.16\)/);
 assert.match(css,/\.client-home-actions \.large-cta \{[^}]*background: #336699/);
 assert.match(read('app/book/page.tsx').toString(),/className="button primary large-cta"[^>]*onClick=\{openBookingFlow\}/);
});
