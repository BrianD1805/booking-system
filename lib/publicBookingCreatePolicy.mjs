// Ver-0.062: Safe HTTP responses for booking creation, including DB concurrency.
// The database's 23P01 code is emitted by the tenant-aware overlap trigger.
const safeBookingMessages = [
  /^Enter a valid appointment date and start time\.$/,
  /^Appointments cannot be booked in the past\./,
  /^This practice does not accept same-day online bookings\.$/,
  /^This appointment is too far ahead\./,
  /^Online bookings require at least [0-9]+(?:\.[0-9]+)? hours' notice\.$/,
  /^Choose a valid appointment date\.$/,
  /^The practice is closed on (?:the selected day|this date)\./,
  /^The appointment must fit within the practice opening hours\.$/,
  /^The practice is closed for its lunch break at this time\.$/,
  /^The selected practitioner (?:cannot perform this procedure|is not working at this time|is on a lunch break at this time|is blocked at this time)\./,
  /^The practice is blocked at this time\./,
  /^The selected service is no longer available\./
];

export function bookingCreateError(error) {
  const code = typeof error?.code === 'string' ? error.code : error?.cause?.code;
  const message = error instanceof Error ? error.message : '';
  // Do not expose PostgreSQL internal messages, SQL or private booking details.
  if (code === '23P01' || /That practitioner already has a booking at this time\./.test(message)) {
    return { status: 409, message: 'That time has just been taken. Please choose another available slot.' };
  }
  if (/Staff login|Master admin/.test(message)) return { status: 401, message: 'Staff login is required.' };
  if (safeBookingMessages.some((pattern) => pattern.test(message))) return { status: 400, message };
  return { status: 500, message: 'Could not create booking. Please try again.' };
}
