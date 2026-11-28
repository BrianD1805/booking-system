import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const url=p=>new URL('../'+p,import.meta.url);
const read=p=>readFileSync(url(p),'utf8');
const page=read('app/installation/page.tsx');
test('retired widget page redirects and public navigation and offline cache use installation route',()=>{
 assert.equal(existsSync(url('app/widget/page.tsx')),false);
 assert.match(read('next.config.ts'),/source: '\/widget', destination: '\/installation', permanent: true/);
 for(const p of ['app/page.tsx','app/demo/page.tsx','components/Header.tsx','public/sw.js']) {assert.doesNotMatch(read(p),/['"]\/widget['"]/);assert.match(read(p),/\/installation/);}
});
test('installation guide uses real code generator and explains required authorization and fallback',()=>{
 for(const id of ['get-code','direct-link','html-widget','react-widget','check-install','faqs']) assert.ok(page.includes(`id="${id}"`));
 assert.match(page,/bookingHtmlSnippet\(exampleSlug\)/);assert.match(page,/reactEmbedSnippet\(exampleSlug,'public'\)/);
 assert.match(page,/exact HTTPS origin/);assert.match(page,/placeholder/);assert.match(page,/direct booking link instead/);
 assert.match(read('app/installation/InstallationCode.tsx'),/navigator\.clipboard\.writeText\(code\)/);
});
test('public guide uses marketing styling and has no operational login links',()=>{
 assert.match(page,/landing\.module\.css/);assert.match(page,/aria-label="Main navigation"/);
 assert.doesNotMatch(page,/href="\/(?:admin|login|platform|book|staff-reset)(?:[/?"])/);
 assert.match(page,/faq\.map/);assert.match(page,/<details key=\{question\}>/);
 assert.match(read('app/page.tsx'),/href="\/installation#faqs"/);
});
test('social image is original square master, with exact PNG metadata dimensions',()=>{
 const image=readFileSync(url('public/og-image.png'));
 assert.deepEqual(image,readFileSync(url('public/icons/zipbook-icon-master.png')));
 assert.equal(image.readUInt32BE(16),1254);assert.equal(image.readUInt32BE(20),1254);
 const layout=read('app/layout.tsx');assert.match(layout,/width: 1254,\s*height: 1254/);assert.match(layout,/openGraph:/);assert.match(layout,/twitter:/);assert.match(layout,/og-image\.png\?v=0\.066\.2/);
});
