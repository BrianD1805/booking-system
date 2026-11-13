import test from 'node:test';
import assert from 'node:assert/strict';
import { insideHours, overlaps, crossesLunch, dayOfWeek, minutes } from '../lib/schedulingPolicy.mjs';

test('rejects appointments finishing beyond practice or practitioner closing time', () => {
  assert.equal(insideHours('17:30', '18:00', '08:30', '18:00'), true);
  assert.equal(insideHours('17:30', '18:30', '08:30', '18:00'), false);
  assert.equal(insideHours('17:30', '18:00', '09:00', '17:00'), false);
});
test('slots overlapping per-doctor lunch are unavailable, adjacent appointments are allowed', () => {
  assert.equal(crossesLunch('12:45','13:15',true,'13:00','14:00'), true);
  assert.equal(crossesLunch('12:30','13:00',true,'13:00','14:00'), false);
  assert.equal(crossesLunch('14:00','14:30',true,'13:00','14:00'), false);
  assert.equal(crossesLunch('13:00','13:30',false,'13:00','14:00'), false);
});
test('leave and appointments detect partial overlaps', () => {
  assert.equal(overlaps('09:30','10:00','09:00','17:00'),true);
  assert.equal(overlaps('08:00','09:00','09:00','17:00'),false);
});
test('date day-of-week is stable regardless of server timezone', () => {
  assert.equal(dayOfWeek('2026-11-13'),5);
  assert.equal(dayOfWeek('2026-11-14'),6);
  assert.equal(dayOfWeek('2026-02-30'),-1);
  assert.ok(Number.isNaN(minutes('25:00')));
});
