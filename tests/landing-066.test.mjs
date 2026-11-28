import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('app/page.tsx'),css=read('app/landing.module.css');
test('public landing offers product features, onboarding and integration',()=>{
 for(const id of ['hero-title','features-title','workflow-title','integration-title','cta-title']) assert.ok(page.includes(`id="${id}"`));
 assert.match(page,/Business accounts are currently created by invitation/);
 assert.match(page,/fictional appointments/);
 assert.match(page,/Example workspace/);
});
test('demo CTA follows protected entry and existing application links are retained',()=>{
 for(const route of ['/demo','/book','/admin','/widget']) assert.ok(page.includes(`href="${route}"`));
 assert.doesNotMatch(page,/href="\/platform|href="\/book\?demo/);
 assert.match(page,/APP_VERSION/);
});
test('Inter and new palette are isolated to landing CSS module',()=>{
 assert.match(page,/import styles from '\.\/landing\.module\.css'/);
 assert.match(css,/\.landing\s*\{[^}]*--land-blue:#336699;[^}]*font-family:Inter,Arial,Helvetica,sans-serif/);
 assert.match(css,/fonts\.googleapis\.com\/css2\?family=Inter/);
 for(const path of ['app/layout.tsx','app/book/page.tsx','app/platform/page.tsx','app/globals.css']) assert.doesNotMatch(read(path),/landing\.module\.css/);
});
test('landing has responsive grids, keyboard access and reduced motion',()=>{
 assert.match(css,/@media\(max-width:820px\)/); assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/\.landing a:focus-visible/); assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(page,/href="#main-content"/); assert.match(page,/aria-label="Main navigation"/);
});
