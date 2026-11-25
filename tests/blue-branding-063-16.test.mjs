import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url));
const css=read('app/globals.css').toString();
test('blue palette replaces old purple styling and retains primary blue',()=>{
 assert.doesNotMatch(css,/#8223fa|137, 82, 205|156, 116, 216|155, 113, 210/i);
 assert.match(css,/--zw-blue: #336699/);assert.match(css,/--zw-secondary: #0C59A0/);
 assert.match(css,/rgba\(83, 212, 254, 0.23\)/);assert.match(css,/rgba\(12, 89, 160, 0.23\)/);
});
test('thicker field borders exclude native choice controls and date inner input',()=>{
 assert.match(css,/input:not\(\[type=checkbox\]\):not\(\[type=radio\]\)/);
 assert.match(css,/textarea, select, .zip-select-button, .zip-date-manual-control \{\s*border-width: 2px !important/);
 assert.match(css,/\.zip-date-manual-control input \{ border-width: 0 !important/);
});
test('manifest icons and master are present with expected dimensions',()=>{
 for(const file of ['manifest-client.json','manifest-admin.json']) for(const icon of JSON.parse(read('public/'+file)).icons){const b=read('public'+icon.src);assert.equal(b.readUInt32BE(16),Number(icon.sizes.split('x')[0]));}
 assert.deepEqual(read('public/apple-touch-icon.png'),read('public/icons/icon-180.png'));
});
test('platform, diary and demo use shared brand assets',()=>{
 for(const file of ['app/platform/page.tsx','components/admin/AdminAuthGate.tsx','app/demo/page.tsx','components/Header.tsx']) assert.match(read(file).toString(),/\/icons\/icon-72.png/);
});
