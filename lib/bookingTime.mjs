// All booking start-time comparisons use the practice's IANA timezone, not the
// browser's timezone or Netlify's (typically UTC) server timezone.
export const FALLBACK_PRACTICE_TIME_ZONE = 'Africa/Nairobi';

export function practiceDateTimeKey(now = new Date(), timeZone = FALLBACK_PRACTICE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

export function getPracticeToday(now = new Date(), timeZone = FALLBACK_PRACTICE_TIME_ZONE) {
  return practiceDateTimeKey(now, timeZone).slice(0, 10);
}

function validBookingDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function validBookingTime(time) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) return false;
  return true;
}

export function bookingStartIsPast(date, time, timeZone = FALLBACK_PRACTICE_TIME_ZONE, now = new Date()) {
  if (!validBookingDate(date) || !validBookingTime(time)) return true;
  // Equal minute is not bookable: its start has already arrived.
  return `${date}T${time.slice(0, 5)}` <= practiceDateTimeKey(now, timeZone);
}

export function assertFutureBookingStart(date, time, timeZone = FALLBACK_PRACTICE_TIME_ZONE, now = new Date()) {
  if (!validBookingDate(date) || !validBookingTime(time)) {
    throw new Error('Enter a valid appointment date and start time.');
  }
  if (bookingStartIsPast(date, time, timeZone, now)) {
    throw new Error('Appointments cannot be booked in the past. Please choose a future date and time.');
  }
}
