import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoResetAllowedIds, validateDemoSettings, assertDemoResetConfirmation} from '../lib/demoResetPolicy.mjs';
import {businessManifest} from '../lib/brandingPolicy.mjs';
const read=relative=>readFileSync(new URL(`../${relative}`,import.meta.url),'utf8');
const baseline={workingDays:[1,2,3,4,5],workingStartTime:'08:30',workingEndTime:'17:00',slotIntervalMinutes:15,minimumNoticeHours:2,maxBookingAheadDays:90,lunchBreakEnabled:false,lunchBreakStart:'13:00',lunchBreakEnd:'14:00',allowSameDayBookings:true,cancellationPolicyNote:'Demo only',clientPhoneCountryCode:'GB',timezone:'Europe/London',currencyCode:'GBP'};

test('demo reset has a private allowlist and is deny-by-default',()=>{
  assert.deepEqual(demoResetAllowedIds(''),[]);
  assert.deepEqual(demoResetAllowedIds(undefined),[]);
  assert.deepEqual(demoResetAllowedIds('practice_001,practice_001,bad-id,practice-12345678-1234-1234-1234-123456789abc'),['practice_001','practice-12345678-1234-1234-1234-123456789abc']);
  assert.deepEqual(demoResetAllowedIds('practice_001,../../practices'),['practice_001']);
});
test('saved defaults validate all fields and reject destructive unknown settings',()=>{
  assert.deepEqual(validateDemoSettings(baseline),baseline);
  for(const invalid of [{...baseline,slotIntervalMinutes:0},{...baseline,clientPhoneCountryCode:'K-E'},{...baseline,ownerEmail:'change@wrong.com'},{...baseline,workingDays:[]},{...baseline,workingEndTime:'08:00'},{...baseline,allowSameDayBookings:'true'},{...baseline,timezone:'Invalid/Place'},{...baseline,currencyCode:'UK'}]) assert.throws(()=>validateDemoSettings(invalid));
});
test('reset needs acknowledgement plus exact DELETE',()=>{
  assert.throws(()=>assertDemoResetConfirmation('delete',true));
  assert.throws(()=>assertDemoResetConfirmation('DELETE',false));
  assert.doesNotThrow(()=>assertDemoResetConfirmation('DELETE',true));
});
test('platform reset endpoint is platform-key protected with exact same origin',()=>{
  const api=read('app/api/platform/demo-reset/route.ts');
  assert.match(api,/withPlatformRequest\(request,true/);
  assert.match(read('lib/platformRequest.ts'),/x-zipbook-platform-key/);
  assert.match(read('lib/platformRequest.ts'),/origin/);
  assert.match(read('app/platform/page.tsx'),/DemoResetPanel/);
  assert.match(read('components/platform/DemoResetPanel.tsx'),/Type DELETE|type DELETE/i);
});
test('server never wipes an unapproved tenant or staff and retains database audit',()=>{
  const src=read('lib/platformDemoReset.ts');
  assert.match(src,/requireAllowed\(id\)/);
  assert.match(src,/WHERE practice_id=\$1/);
  assert.match(src,/DELETE FROM public\.practitioner_blocked_times WHERE practitioner_id IN \(SELECT id FROM public\.practitioners WHERE practice_id=\$1\)/);
  assert.doesNotMatch(src,/TRUNCATE|DELETE FROM public\.admin_staff|DELETE FROM public\.practices/);
  assert.match(src,/platform_demo_data_reset/);
  assert.match(src,/FOR UPDATE/);
  assert.match(read('supabase/zipbook_demo_reset_ver_0_063_4.sql'),/ENABLE ROW LEVEL SECURITY/);
  assert.match(read('supabase/zipbook_demo_reset_ver_0_063_4.sql'),/REVOKE ALL/);
});
test('legacy PWA manifest declares maskable artwork without modifying source image',()=>{
  const icons=businessManifest('ZipBook',null).icons;
  assert.equal(icons.length,4);
  assert.deepEqual(icons.filter(icon=>icon.purpose==='maskable').map(icon=>icon.src),['/icons/maskable-192.png','/icons/maskable-512.png']);
  assert.equal(businessManifest('Demo Dental','0b15240a-10a1-4a12-a321-bacecddf0000').icons.length,2);
  assert.match(read('app/api/branding/manifest/route.ts'),/tenant\.legacy \? null : version/);
});
