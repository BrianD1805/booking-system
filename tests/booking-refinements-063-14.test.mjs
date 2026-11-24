import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const css=read('app/globals.css'), page=read('app/book/page.tsx');
test('booking backdrop is white and input focus is soft grey',()=>{
 assert.match(css,/\.booking-workflow\.is-open \{ background: #ffffff/);
 assert.match(css,/\.client-book-shell \.client-auth-popup :is\(input, textarea\):focus \{[^}]*#e5ebf2/);
});
test('notes spacing and mobile home sizing are scoped',()=>{
 assert.match(page,/form-row booking-notes-row/);
 assert.match(css,/\.booking-workflow \.booking-notes-row \{ margin-top: 16px/);
 assert.match(css,/\.client-book-shell \{ padding-top: 12px; padding-bottom: 10px/);
});
test('login validates mobile and shows busy/error feedback with timeout',()=>{
 const login=page.slice(page.indexOf('async function signInClient()'),page.indexOf('function signOutClient()'));
 assert.match(login,/not an email address/);
 assert.match(login,/kind: 'busy'/);
 assert.match(login,/kind: 'error', message/);
 assert.match(login,/signal: controller.signal/);
 assert.match(login,/window.clearTimeout/);
 assert.match(page,/Logging you in…/);
});
test('account disclosure border and icon circle persist in both states',()=>{
 assert.match(css,/\.client-account-dropdown \{\s*border: 1px solid #d8e5f4/);
 assert.match(css,/\.client-account-dropdown > summary::before \{[^}]*border-radius: 50%/);
});
