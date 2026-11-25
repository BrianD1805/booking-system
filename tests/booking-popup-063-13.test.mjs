import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const css=read('app/globals.css'), page=read('app/book/page.tsx');
test('booking heading and scoped white surfaces',()=>{
 assert.match(page,/className="booking-step-heading"/);
 assert.match(css,/\.booking-workflow \.booking-step-heading \{[^}]*display: flex/);
 assert.match(css,/\.booking-workflow \.diary-inline-actions \{\s*background: #ffffff/);
});
test('booking scrollbar colour, hidden buttons and track padding',()=>{
 assert.match(css,/scrollbar-color: #0761B3 #ffffff/);
 assert.match(css,/flow-step::-webkit-scrollbar-track \{ background: #ffffff; margin-block: 16px/);
 assert.match(css,/flow-step::-webkit-scrollbar-button:single-button \{ display: none/);
});
test('account cancellation keeps existing API and disclosure icons',()=>{
 assert.match(page,/'Cancelling…' : 'Cancel'/);
 assert.match(page,/method: 'DELETE'/);
 assert.match(css,/\.client-account-dropdown\[open\] > summary:after \{[^}]*rotate\(45deg\)/);
});
test('desktop header matches existing welcome panel width',()=>{
 assert.match(css,/\.client-home-welcome \{\s*width: min\(100%, 760px\)/);
 assert.match(css,/@media \(min-width: 761px\) \{\s*\.client-home-topbar \{ width: min\(100%, 760px\)/);
});
