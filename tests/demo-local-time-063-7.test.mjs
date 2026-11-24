import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {practiceTimeToInstant,demoLocalParts,demoLocalRange,demoLocalTime,demoLocalDayLabel} from '../lib/demoLocalTime.mjs';
const source=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('real practice slots convert into demo visitor local time in UK winter',()=>{
  assert.equal(practiceTimeToInstant('2026-11-24','11:00','Africa/Nairobi')?.toISOString(),'2026-11-24T08:00:00.000Z');
  assert.equal(demoLocalRange('2026-11-24','11:00','11:30','Africa/Nairobi','Europe/London'),'08:00–08:30');
  assert.equal(demoLocalTime('2026-11-24','11:00','Africa/Nairobi','Europe/London'),'08:00');
});

test('daylight saving handled by IANA timezone and not a hardcoded offset',()=>{
  assert.equal(demoLocalRange('2026-07-24','11:00','11:30','Africa/Nairobi','Europe/London'),'09:00–09:30');
  assert.equal(demoLocalRange('2026-11-24','11:00','11:30','Africa/Nairobi','America/New_York'),'03:00–03:30');
});

test('crossing midnight labels the local day and date so it is not misbooked',()=>{
  assert.equal(demoLocalTime('2026-11-24','01:00','Africa/Nairobi','Europe/London'),'22:00 (23/11/2026)');
  assert.equal(demoLocalRange('2026-11-24','01:00','01:30','Africa/Nairobi','Europe/London'),'22:00–22:30 (23/11/2026)');
  assert.equal(demoLocalParts('2026-11-24','01:00','Africa/Nairobi','Europe/London')?.date,'2026-11-23');
  assert.match(demoLocalDayLabel('2026-11-24','01:00','Africa/Nairobi','Europe/London'),/23 November 2026/);
});

test('real booking API values stay in the practice timezone',()=>{
  const admin=source('app/admin/page.tsx');
  const book=source('app/book/page.tsx');
  const reception=source('app/admin/reception/page.tsx');
  for(const component of [admin,book,reception]){
    assert.match(component,/demoLocalRange|showRange/);
    assert.match(component,/bookingStartIsPast\(/);
  }
  assert.match(book,/time: selectedTime,/);
  assert.match(admin,/time: selectedTime,/);
  assert.match(reception,/time: selectedTime,/);
  assert.match(admin,/Practice calendar date and availability use/);
  assert.match(book,/The calendar date belongs to the practice/);
});

test('both full demo links open in separate safe tabs',()=>{
  const page=source('app/demo/page.tsx');
  assert.match(page,/href="\/book" target="_blank" rel="noopener noreferrer"/);
  assert.match(page,/href=\{diaryHref\} target="_blank" rel="noopener noreferrer"/);
});

test('WebKit tap flash is disabled globally without removing focus-visible outlines',()=>{
  const css=source('app/globals.css');
  assert.match(css,/\*, \*::before, \*::after\s*\{\s*-webkit-tap-highlight-color: transparent !important;/);
  assert.match(css,/:focus-visible\s*\{\s*outline: 3px solid #336699;/);
});
