import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const landing=read('app/page.tsx'),demo=read('app/demo/page.tsx');
test('public marketing pages provide no login navigation or new login route',()=>{
 for(const page of [landing,demo]) assert.doesNotMatch(page,/href="\/(?:login|admin|platform|staff-reset)(?:[/?"])/);
 assert.doesNotMatch(landing,/href="\/book(?:[/?"])/);
 assert.equal(existsSync(new URL('../app/login/page.tsx',import.meta.url)),false);
});
test('demo shares marketing styling without changing protected demo entry',()=>{
 assert.match(demo,/import styles from '\.\.\/landing\.module\.css'/);
 assert.match(demo,/styles\.landing/);assert.match(demo,/styles\.header/);assert.match(demo,/styles\.footer/);
 assert.match(demo,/ref=\{widget\}/);assert.match(demo,/startDemo\(\)/);assert.match(demo,/verifyCode\(\)/);
});
test('both pages use the actual diary screenshot asset and identify example data',()=>{
 for(const page of [landing,demo]) {assert.match(page,/src="\/images\/practice-diary-preview\.webp"/);assert.match(page,/fictional (appointments|bookings)/i);}
 const image=readFileSync(new URL('../public/images/practice-diary-preview.webp',import.meta.url));
 assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');assert.ok(image.length>10000);
});
