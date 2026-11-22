import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const sourcePath = new URL('../lib/availability.ts', import.meta.url);
const adminPage = readFileSync(new URL('../app/admin/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

// Import the real availability implementation, transpiled in memory. Its only
// runtime dependency is the existing pure schedulingPolicy.mjs module.
const mockSource = readFileSync(new URL('../lib/mockData.ts', import.meta.url), 'utf8');
const realDuration = mockSource.match(/export function procedureDuration\([^\n]*\) \{[^}]*\}/)?.[0];
assert.ok(realDuration, 'real procedureDuration helper exists');
const source = readFileSync(sourcePath, 'utf8')
  .replace("from '@/lib/schedulingPolicy.mjs'", `from '${new URL('../lib/schedulingPolicy.mjs', import.meta.url).href}'`)
  .replace(/import \{\s*procedureDuration,[\s\S]*?\} from '@\/lib\/mockData';/, '')
  + '\n' + realDuration.replace('= fallbackProcedures', '= []');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const { getDiarySlotsForDate, getAvailabilityForDate } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const mon = '2026-11-23';
const practitioner = { id: 'plonker', name: 'Dr Plonker', role: 'Dentist', active: true, displayOrder: 100 };
const procedure = { id: 'pull', name: 'Pull All Teeth', durationMinutes: 60, active: true, displayOrder: 100 };
function context() {
  return {
    practiceSettings: {
      workingDays: [1,2,3,4,5], workingStartTime: '08:30', workingEndTime: '17:00',
      slotIntervalMinutes: 30, lunchBreakEnabled: false,
      lunchBreakStart: '13:00', lunchBreakEnd: '14:00'
    },
    procedures: [procedure], blockedDates: [], blockedTimes: [],
    practitioners: [practitioner],
    practitionerWorkingHours: [{ practitionerId: 'plonker', dayOfWeek: 1, active: true, startTime: '09:00', endTime: '17:00', lunchBreakEnabled: false, lunchBreakStart: '12:00', lunchBreakEnd: '13:00' }],
    practitionerProcedures: [{ practitionerId: 'plonker', procedureId: 'pull' }],
    practitionerBlockedTimes: []
  };
}

test('diary preview ignores a missing checkup while retaining configured 30-minute working slots', () => {
  const slots = getDiarySlotsForDate([], mon, context());
  assert.equal(slots.length, 17); // 08:30 to 17:00
  assert.equal(slots[0].available, false); // starts before clinician hours
  assert.equal(slots[1].time, '09:00');
  assert.equal(slots[1].endTime, '09:30');
  assert.equal(slots[1].available, true);
  assert.equal(slots[1].availablePractitioners.length, 1);
  assert.equal(slots.at(-1).time, '16:30');
  assert.equal(slots.at(-1).available, true);
  assert.equal(slots.some(s => s.reason === 'No practitioner can perform this procedure'), false);
});

test('procedure-specific bookings still require an assigned practitioner', () => {
  const ctx = context();
  ctx.practitionerProcedures = [];
  assert.equal(getAvailabilityForDate([], mon, 'pull', ctx)[0].reason, 'No practitioner can perform this procedure');
  assert.equal(getDiarySlotsForDate([], mon, ctx).filter(s => s.available).length, 16);
});

test('individual clinician filter, working hours, and inactive clinicians are respected', () => {
  const ctx = context();
  assert.equal(getDiarySlotsForDate([], mon, ctx, 'other')[0].reason, 'No active practitioners in this diary');
  ctx.practitioners = [{ ...practitioner, active: false }];
  assert.equal(getDiarySlotsForDate([], mon, ctx)[0].reason, 'No active practitioners in this diary');
});

test('appointments, lunch and leave still block preview slots', () => {
  const ctx = context();
  ctx.practitionerWorkingHours[0].lunchBreakEnabled = true;
  ctx.practitionerWorkingHours[0].lunchBreakStart = '12:00';
  ctx.practitionerWorkingHours[0].lunchBreakEnd = '13:00';
  ctx.practitionerBlockedTimes.push({ practitionerId: 'plonker', date: mon, startTime: '10:00', endTime: '10:30', reason: 'Leave' });
  const bookings = [{ date: mon, practitionerId: 'plonker', time: '09:30', endTime: '10:00', status: 'confirmed', patientName: 'Test' }];
  const slots = getDiarySlotsForDate(bookings, mon, ctx);
  const lookup = (at) => slots.find(s => s.time === at);
  assert.match(lookup('09:30').reason, /Already booked/);
  assert.match(lookup('10:00').reason, /Practitioner blocked/);
  assert.match(lookup('12:00').reason, /lunch break/);
  assert.equal(lookup('13:00').available, true);
});

test('practice closed days and full-day closures still apply', () => {
  const ctx = context();
  assert.equal(getDiarySlotsForDate([], '2026-11-22', ctx)[0].reason, 'Practice is closed on this day');
  ctx.blockedDates = [{ date: mon, reason: 'Bank holiday' }];
  assert.equal(getDiarySlotsForDate([], mon, ctx)[0].reason, 'Bank holiday');
});

test('administrative slot preview uses procedure-independent routine; booking flow remains procedure-specific', () => {
  assert.match(adminPage, /getDiarySlotsForDate\(/);
  assert.match(adminPage, /getAvailabilityForDate\(availabilityBookings, selectedDate, activeProcedureId/);
  assert.doesNotMatch(adminPage, /diarySlotPreviewProcedureId/);
});

test('diary preview follows a changed 15-minute business interval, including slot counts', () => {
  const ctx = context();
  ctx.practiceSettings.slotIntervalMinutes = 15;
  const slots = getDiarySlotsForDate([], mon, ctx);
  assert.equal(slots.length, 34); // 08:30–17:00 at 15-minute intervals
  assert.deepEqual(slots.slice(0, 4).map((s) => [s.time, s.endTime]), [
    ['08:30', '08:45'], ['08:45', '09:00'],
    ['09:00', '09:15'], ['09:15', '09:30']
  ]);
  assert.equal(slots.filter((slot) => slot.available).length, 32); // 09:00–17:00
  assert.equal(slots.at(-1).time, '16:45');
  assert.equal(slots.at(-1).endTime, '17:00');
});

test('diary preview automatically supports other valid settings, not only 15 or 30 minutes', () => {
  const ctx = context();
  ctx.practiceSettings.slotIntervalMinutes = 20;
  const twenty = getDiarySlotsForDate([], mon, ctx);
  assert.equal(twenty[0].time, '08:30');
  assert.equal(twenty[0].endTime, '08:50');
  assert.equal(twenty[1].time, '08:50');
  assert.equal(twenty[1].endTime, '09:10');
  ctx.practiceSettings.slotIntervalMinutes = 60;
  const sixty = getDiarySlotsForDate([], mon, ctx);
  assert.equal(sixty.length, 9);
  assert.equal(sixty[0].endTime, '09:30');
  assert.equal(sixty[1].time, '09:30');
  assert.equal(sixty[1].endTime, '10:30');
  assert.equal(sixty.at(-1).available, false);
  assert.match(sixty.at(-1).reason, /Not enough time/);
});

test('15-minute preview marks all slots overlapping longer appointments as unavailable', () => {
  const ctx = context();
  ctx.practiceSettings.slotIntervalMinutes = 15;
  const bookings = [{ date: mon, practitionerId: 'plonker', time: '09:15', endTime: '10:00', status: 'confirmed', patientName: 'Test' }];
  const slots = getDiarySlotsForDate(bookings, mon, ctx);
  for (const time of ['09:15', '09:30', '09:45']) {
    const slot = slots.find((s) => s.time === time);
    assert.equal(slot.available, false, `Slot ${time} overlaps the appointment`);
    assert.match(slot.reason, /Already booked/);
  }
  assert.equal(slots.find((s) => s.time === '10:00').available, true);
  assert.equal(slots.filter((s) => s.available).length, 29);
});

test('UI description reflects live interval and full diary grid expands without an inner scrollbar', () => {
  assert.match(adminPage, /Visual \{practiceSettings\.slotIntervalMinutes\}-minute diary preview/);
  assert.doesNotMatch(adminPage, /Visual 30-minute diary preview/);
  assert.match(css, /\.live-diary-panel \.diary-slots-panel \.admin-slot-grid\s*\{[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/);
  assert.match(adminPage, /className="slot-grid admin-slot-grid"/);
});
