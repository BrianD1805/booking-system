import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {practiceTimeZoneOptions, isValidPracticeTimeZone} from '../lib/practiceTimeZones.mjs';
import {practiceDateTimeKey,getPracticeToday,bookingStartIsPast} from '../lib/bookingTime.mjs';
import {validateDemoSettings} from '../lib/demoResetPolicy.mjs';

const source = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url),'utf8');
const admin = source('app/admin/page.tsx');
const client = source('app/book/page.tsx');
const reception = source('app/admin/reception/page.tsx');
const defaults = {workingDays:[1,2,3,4,5],workingStartTime:'08:30',workingEndTime:'17:00',slotIntervalMinutes:30,minimumNoticeHours:2,maxBookingAheadDays:90,lunchBreakEnabled:false,lunchBreakStart:'13:00',lunchBreakEnd:'14:00',allowSameDayBookings:true,cancellationPolicyNote:'',clientPhoneCountryCode:'GB',timezone:'Europe/London',currencyCode:'GBP'};

test('selectable timezones use valid IANA values, contain London, Nairobi, and preserve selected values',()=>{
  assert.ok(isValidPracticeTimeZone('Europe/London'));
  assert.ok(isValidPracticeTimeZone('Africa/Nairobi'));
  assert.equal(isValidPracticeTimeZone('Nowhere/Invalid'),false);
  const options = practiceTimeZoneOptions('Europe/London');
  assert.ok(options.length >= 10);
  assert.ok(options.some(x=>x.value==='Europe/London'));
  assert.ok(options.some(x=>x.value==='Africa/Nairobi'));
  assert.ok(options.every(x=>isValidPracticeTimeZone(x.value)));
  assert.equal(new Set(options.map(x=>x.value)).size,options.length);
});

test('Admin Settings provides a searchable timezone selector alongside currency and server validation',()=>{
  const page=source('app/admin/settings/page.tsx');
  const api=source('app/api/admin-settings/route.ts');
  assert.match(page,/Practice time zone<\/span><ZipSelect[^>]*searchable/);
  assert.match(page,/currencyCode','Currency/);
  assert.match(api,/timeZone: timezone/);
  assert.match(api,/timezone=\$\{timezone\},currency_code=\$\{currencyCode\}/);
});

test('demo reset saves and restores timezone/currency without rewriting existing appointments',()=>{
  assert.deepEqual(validateDemoSettings(defaults),defaults);
  for(const bad of [{...defaults,timezone:'Not/AZone'},{...defaults,currencyCode:'GB'},{...defaults,currencyCode:'usd'}]) assert.throws(()=>validateDemoSettings(bad));
  const reset = source('lib/platformDemoReset.ts');
  assert.match(reset,/timezone:row\.timezone/);
  assert.match(reset,/currencyCode:row\.currency_code/);
  assert.match(reset,/\.\.\.asSettings\(practice\),\.\.\.\(saved\.default_settings as object\)/);
  assert.match(reset,/timezone=\$14, currency_code=\$15/);
  assert.doesNotMatch(reset,/UPDATE public\.bookings SET|UPDATE bookings SET/);
  const panel = source('components/platform/DemoResetPanel.tsx');
  assert.match(panel,/demo-practice-timezone/);
  assert.match(panel,/currencyCode','Practice currency/);
  assert.match(panel,/searchable value=\{draft\.timezone\}/);
});

test('practice date boundary and past-slot policy use configured timezone, not browser locale',()=>{
  const instant = new Date('2026-11-24T23:30:00Z');
  assert.equal(getPracticeToday(instant,'Europe/London'),'2026-11-24');
  assert.equal(getPracticeToday(instant,'Africa/Nairobi'),'2026-11-25');
  assert.equal(practiceDateTimeKey(instant,'Africa/Nairobi'),'2026-11-25T02:30');
  assert.equal(bookingStartIsPast('2026-11-25','02:00','Africa/Nairobi',instant),true);
  assert.equal(bookingStartIsPast('2026-11-25','02:00','Europe/London',instant),false);
});

test('diary, booking and reception render stored practice dates/times identically in all modes',()=>{
  for (const [name,page] of [['Diary',admin],['Customer',client],['Reception',reception]]) {
    assert.doesNotMatch(page,/demoLocalTime|demoLocalRange|demoLocalDayLabel|demoLocalParts|localTimeZone/ , `${name} must not convert display`);
    assert.doesNotMatch(page,/demo-timezone-note|your local time|device timezone|local timezone/i);
    assert.match(page,/const showTime = \(_date: string, time: string\) => time;/);
    assert.match(page,/const showRange = \(_date: string,\s*start: string,\s*end: string\) => `\$\{start\}–\$\{end\}`;/);
    assert.match(page,/time: selectedTime,/);
    assert.match(page,/initialPracticeDateSynced/);
    assert.match(page,/getPracticeToday\(new Date\(\), practiceTimeZone\)/);
  }
  assert.match(client,/dateLabel: getDayLabel\(selectedDate\),/);
  assert.match(client,/time: selectedTime,/);
  assert.match(reception,/dateLabel: getDayLabel\(booking\.date\),/);
});

test('practice diary clock and last refresh time use the same business timezone as booking rules',()=>{
  assert.match(admin,/const currentClockLabel = new Intl\.DateTimeFormat\('en-GB', \{\s*timeZone: practiceTimeZone/);
  assert.match(admin,/lastRefreshedLabel = lastRefreshedAt \? new Date\(lastRefreshedAt\)\.toLocaleTimeString\('en-GB', \{ timeZone: practiceTimeZone/);
  assert.match(admin,/bookingStartIsPast\(selectedDate, slot\.time, practiceSettings\.timezone, now\)/);
  assert.match(client,/bookingStartIsPast\(selectedDate, slot\.time, practiceSettings\.timezone, now\)/);
  assert.match(reception,/bookingStartIsPast\(selectedDate, slot\.time, practiceSettings\.timezone, now\)/);
});
