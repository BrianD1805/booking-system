import test from 'node:test';
import assert from 'node:assert/strict';
import { assertFutureBookingStart, bookingStartIsPast, getPracticeToday, practiceDateTimeKey } from '../lib/bookingTime.mjs';

const exampleNow = new Date('2026-11-13T08:28:30.000Z');

test('the practice timezone is used rather than browser/server UTC', () => {
  assert.equal(practiceDateTimeKey(exampleNow, 'Africa/Nairobi'), '2026-11-13T11:28');
  assert.equal(practiceDateTimeKey(exampleNow, 'Europe/London'), '2026-11-13T08:28');
  assert.equal(getPracticeToday(new Date('2026-11-13T22:30:00Z'), 'Africa/Nairobi'), '2026-11-14');
});

test('past dates are rejected, not just expired times on today', () => {
  assert.equal(bookingStartIsPast('2026-11-12', '15:00', 'Africa/Nairobi', exampleNow), true);
  assert.equal(bookingStartIsPast('2026-11-13', '11:00', 'Africa/Nairobi', exampleNow), true);
  assert.equal(bookingStartIsPast('2026-11-13', '11:28', 'Africa/Nairobi', exampleNow), true);
  assert.equal(bookingStartIsPast('2026-11-13', '11:30', 'Africa/Nairobi', exampleNow), false);
  assert.equal(bookingStartIsPast('2026-11-14', '08:00', 'Africa/Nairobi', exampleNow), false);
});

test('the same instant differs across practice timezones', () => {
  assert.equal(bookingStartIsPast('2026-11-13', '09:00', 'Africa/Nairobi', exampleNow), true);
  assert.equal(bookingStartIsPast('2026-11-13', '09:00', 'Europe/London', exampleNow), false);
});

test('UK summer time automatically adjusts', () => {
  const summerNow = new Date('2026-07-15T08:15:00Z');
  assert.equal(practiceDateTimeKey(summerNow, 'Europe/London'), '2026-07-15T09:15');
  assert.equal(bookingStartIsPast('2026-07-15', '09:00', 'Europe/London', summerNow), true);
  assert.equal(bookingStartIsPast('2026-07-15', '09:30', 'Europe/London', summerNow), false);
});

test('server guard throws for past starts and permits future starts', () => {
  assert.throws(() => assertFutureBookingStart('2026-11-13', '11:00', 'Africa/Nairobi', exampleNow), /cannot be booked in the past/);
  assert.doesNotThrow(() => assertFutureBookingStart('2026-11-13', '11:30', 'Africa/Nairobi', exampleNow));
  assert.throws(() => assertFutureBookingStart('2026-11-31', '11:30', 'Africa/Nairobi', exampleNow), /valid appointment date/);
  assert.throws(() => assertFutureBookingStart('2026-11-14', '25:60', 'Africa/Nairobi', exampleNow), /valid appointment date/);
});
