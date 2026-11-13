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


// Client-facing notice and booking-ahead rules are applied on the server too.
// Staff may manage urgent bookings while respecting working hours/leave.
export function assertClientBookingRules(date, time, settings, now = new Date()) {
  const tz = settings.timezone || FALLBACK_PRACTICE_TIME_ZONE;
  assertFutureBookingStart(date, time, tz, now);
  const key = practiceDateTimeKey(now, tz);
  const today = key.slice(0, 10);
  if (settings.allowSameDayBookings === false && date === today) {
    throw new Error('This practice does not accept same-day online bookings.');
  }
  const daysAhead = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (daysAhead > Number(settings.maxBookingAheadDays ?? 90)) {
    throw new Error('This appointment is too far ahead. Choose an earlier date.');
  }
  const noticeMinutes = Number(settings.minimumNoticeHours ?? 0) * 60;
  const appointmentMinute = Date.parse(`${date}T${time.slice(0,5)}:00Z`);
  const nowMinute = Date.parse(`${key}:00Z`);
  if (noticeMinutes > 0 && appointmentMinute - nowMinute < noticeMinutes * 60000) {
    throw new Error(`Online bookings require at least ${settings.minimumNoticeHours} hours' notice.`);
  }
}
