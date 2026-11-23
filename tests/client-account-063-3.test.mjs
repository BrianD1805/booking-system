import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('mobile-only client account badge has exact requested label while desktop badge remains unchanged', () => {
  const page = read('app/book/page.tsx');
  const css = read('app/globals.css');
  assert.match(page, /client-auth-desktop-label">Client account<\/span>/);
  assert.match(page, /client-auth-mobile-label">Client Account - Login\/Setup<\/span>/);
  assert.match(css, /@media \(max-width: 700px\) \{[\s\S]*?\.client-auth-desktop-label \{ display: none; \}/);
  assert.match(css, /\.client-auth-mobile-label \{ display: inline; \}/);
});

test('close button is outside switch row, mobile close anchored top-right and switch centred on separate row', () => {
  const page = read('app/book/page.tsx');
  const css = read('app/globals.css');
  const start = page.indexOf('<div className="client-auth-head-actions">');
  const end = page.indexOf('</div>\n              <button className="icon-button mobile-close client-auth-header-close"', start);
  assert.ok(start > 0 && end > start, 'expected separate direct close button');
  assert.doesNotMatch(page.slice(start, end), /mobile-close/);
  assert.match(css, /\.client-auth-head > \.client-auth-header-close \{[\s\S]*?top: 12px !important;[\s\S]*?right: 16px !important;/);
  assert.match(css, /\.auth-header-toggle \{[\s\S]*?position: static !important;[\s\S]*?margin: 0 auto !important;/);
  assert.match(css, /grid-template-rows: auto 46px/);
});

test('toggle has no WebKit tap flash and still supports visible keyboard focus', () => {
  const css = read('app/globals.css');
  assert.match(css, /\.auth-header-toggle \.auth-toggle-switch[\s\S]*?-webkit-tap-highlight-color: transparent !important/);
  assert.match(css, /\.auth-header-toggle button:focus-visible \{ outline:/);
});

test('login signup reset and guest booking phone inputs suppress standard autofill', () => {
  const page = read('app/book/page.tsx');
  for (const id of ['clientLoginPhone','clientResetPhone','patientPhone']) {
    const line = page.split('\n').find(line => line.includes(`<input id="${id}"`));
    assert.ok(line, `expected phone field ${id}`);
    assert.match(line, /autoComplete="off"/);
    assert.match(line, /data-lpignore="true"/);
    assert.match(line, /data-1p-ignore="true"/);
    assert.match(line, /inputMode="tel"/);
  }
});

test('account fields have extra scrollbar clearance without changing other form layouts', () => {
  const css = read('app/globals.css');
  assert.match(css, /\.client-auth-card:not\(\.client-reset-card\) > \.grid,[\s\S]*?padding-right: 19px !important/);
  assert.match(css, /@media \(max-width: 700px\) \{[\s\S]*?padding-right: 16px !important/);
});
