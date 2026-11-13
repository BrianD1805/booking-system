// ZipBook Ver-0.054: shared client/server working window and break rules.
export function minutes(time) {
  if (typeof time !== 'string' || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) return NaN;
  const [h, m] = time.split(':').map(Number);
  return h >= 0 && h < 24 && m >= 0 && m < 60 ? (h * 60 + m) : NaN;
}

export function overlaps(startA, endA, startB, endB) {
  const a = minutes(startA), b = minutes(endA), c = minutes(startB), d = minutes(endB);
  return [a, b, c, d].every(Number.isFinite) && a < d && c < b;
}

export function insideHours(start, end, open, close) {
  const a = minutes(start), b = minutes(end), c = minutes(open), d = minutes(close);
  return [a, b, c, d].every(Number.isFinite) && c <= a && b <= d && b > a;
}

export function crossesLunch(start, end, enabled, lunchStart, lunchEnd) {
  return Boolean(enabled) && overlaps(start, end, lunchStart, lunchEnd);
}

export function dayOfWeek(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return -1;
  const date = new Date(`${isoDate}T12:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate ? -1 : date.getUTCDay();
}
