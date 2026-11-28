import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('app/platform/page.tsx');
const panel=ui.match(/<details className="platform-note platform-onboarding">[\s\S]*?<\/details>/)?.[0]||'';
test('business onboarding details start collapsed and stage counts move inside',()=>{
  assert.ok(panel); assert.doesNotMatch(panel,/<details[^>]*\bopen\s*[=>]/); assert.match(panel,/<summary>Business links and onboarding progress<\/summary>/);
  assert.match(panel,/b\.active_practitioners/); assert.match(panel,/b\.active_services/); assert.match(panel,/b\.configured_practitioners/);
  assert.doesNotMatch(ui.replace(panel,''),/active practitioners ·/);
});
test('onboarding stages follow the actual activation sequence',()=>{
  const order=['1. Invitation and owner verification','2. Practice Diary activation','3. Business setup and readiness','4. Public booking activation'];
  let last=-1; for(const stage of order){const next=panel.indexOf(stage);assert.ok(next>last);last=next;}
  assert.match(panel,/kind="invitation"/);assert.match(panel,/kind="diary"/);assert.match(panel,/kind="live"/);
});
test('permanent URLs have safe new-tab anchors and scoped visible link styles',()=>{
  for(const route of ['admin','book']){assert.ok(panel.includes('href={`https://${b.tenant_slug}.zipbook.app/'+route+'`} target="_blank" rel="noopener noreferrer">https://{b.tenant_slug}.zipbook.app/'+route+'</a>'));}
  const css=read('app/globals.css');assert.match(css,/\.platform-onboarding a\.platform-business-url\s*\{[^}]*text-decoration:underline;[^}]*overflow-wrap:anywhere/);
});
test('email and business actions retain existing state and confirmation guards',()=>{
  assert.match(panel,/b\.pilot_enabled&&<button[^>]*disabled=\{busy\|\|!overview\.emailConfigured\}/);
  assert.match(panel,/b\.onboarding_completed&&<button[^>]*disabled=\{busy\|\|!overview\.emailConfigured\}/);
  for(const action of ['resend-diary','resend-live','refresh-email'])assert.ok(panel.includes("action:'"+action+"',id:b.id"));
  assert.match(panel,/not confirmed delivery/);assert.match(ui,/No recorded delivery/);
  for(const action of ['resend','activate','publish','suspend','delete-data'])assert.ok(ui.includes("action:'"+action+"'"));
});
