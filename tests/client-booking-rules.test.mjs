import test from 'node:test';
import assert from 'node:assert/strict';
import { assertClientBookingRules } from '../lib/bookingTime.mjs';
const now = new Date('2026-11-13T09:00:00Z'); // 12:00 Nairobi
const rules = { timezone:'Africa/Nairobi', minimumNoticeHours:2, maxBookingAheadDays:14, allowSameDayBookings:true };
test('accepts an appointment with notice inside booking-ahead window',()=>assert.doesNotThrow(()=>assertClientBookingRules('2026-11-13','14:30',rules,now)));
test('rejects insufficient notice',()=>assert.throws(()=>assertClientBookingRules('2026-11-13','13:00',rules,now),/notice/));
test('rejects bookings beyond the allowed booking-ahead window',()=>assert.throws(()=>assertClientBookingRules('2026-12-01','14:30',rules,now),/far ahead/));
test('respects the practice no-same-day toggle',()=>assert.throws(()=>assertClientBookingRules('2026-11-13','16:00',{...rules,allowSameDayBookings:false},now),/same-day/));
