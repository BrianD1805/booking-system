import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('practitioner procedure buttons have explicit pressed state and selected tick',()=>{
  const source=read('app/admin/settings/page.tsx');
  assert.match(source,/aria-pressed=\{assigned\}/);
  assert.match(source,/assigned \? '✓' : '\+'/);
  assert.match(source,/assigned \? 'selected' : ''/);
  assert.match(source,/className="settings-061a-procedure-indicator"/);
  assert.match(source,/onClick=\{\(\) => setPractitionerDraft/);
});

test('assignment counter, clear instructions and absence warning update from draft state',()=>{
  const source=read('app/admin/settings/page.tsx');
  assert.match(source,/role="status" aria-live="polite"/);
  assert.match(source,/practitionerDraft\.procedureIds\.length/);
  assert.match(source,/Click a procedure to assign it/);
  assert.match(source,/No active procedures assigned/);
  assert.match(source,/No procedures available/);
  assert.match(source,/procedure\.active/);
  assert.match(source,/Save practitioner/);
});

test('clear visual states preserve original popup sizing and footer controls',()=>{
  const css=read('app/globals.css');
  assert.match(css,/\.settings-054-procedure-tags button\.selected/);
  assert.match(css,/\.settings-061a-procedure-indicator/);
  assert.match(css,/\.settings-061a-procedure-warning/);
  assert.match(css,/\.settings-054-modal-footer/);
  assert.match(css,/\.settings-054-modal-scroll/);
});

test('readiness diagnostics come from tenant-scoped counts and do not change gates',()=>{
  const source=read('lib/platformReadiness.ts');
  for(const field of ['active_practitioners','active_services','scheduled_practitioners','assigned_practitioners','configured_practitioners']) {
    assert.match(source,new RegExp(`AS ${field}`));
  }
  assert.match(source,/WHERE d\.practice_id=p\.id AND d\.active/);
  assert.match(source,/WHERE s\.practice_id=p\.id AND s\.active/);
  assert.match(source,/set_config\('zipbook\.practice_id'/);
  assert.doesNotMatch(source,/UPDATE public\.practitioners|DELETE FROM public\.practitioner_procedures/);
});
