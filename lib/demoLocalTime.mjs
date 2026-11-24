// Public demo display only. Real booking dates and times remain in the practice's
// IANA timezone for availability checks, database storage and API mutations.
// Never send the converted display strings back to a booking endpoint.
function wallParts(instant, zone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(instant);
  const read = (type) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute') };
}

function utcFromParts({year,month,day,hour,minute}) {
  return Date.UTC(year, month - 1, day, hour, minute);
}

export function practiceTimeToInstant(practiceDate, practiceTime, practiceZone = 'Africa/Nairobi') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(practiceDate) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(practiceTime)) return null;
  const [year,month,day] = practiceDate.split('-').map(Number);
  const [hour,minute] = practiceTime.split(':').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 24 || minute > 59) return null;
  const target = utcFromParts({year,month,day,hour,minute});
  let guess = target;
  try {
    // Resolve the IANA offset at the actual appointment, including DST. The
    // practice wall time can cross a DST boundary; use the IANA rules, not a
    // fixed Nairobi offset or the visitor's browser offset.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = wallParts(new Date(guess), practiceZone);
      const delta = target - utcFromParts(candidate);
      if (!delta) return new Date(guess);
      guess += delta;
    }
    const finalParts = wallParts(new Date(guess), practiceZone);
    if (utcFromParts(finalParts) !== target) return null; // nonexistent DST wall hour
    return new Date(guess);
  } catch {
    return null;
  }
}

export function demoLocalParts(practiceDate, practiceTime, practiceZone, visitorZone) {
  const instant = practiceTimeToInstant(practiceDate, practiceTime, practiceZone);
  if (!instant) return null;
  try {
    const p = wallParts(instant, visitorZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    return {
      date: `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`,
      time: `${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`
    };
  } catch { return null; }
}

function shortDate(key) {
  const [y,m,d] = key.split('-');
  return `${d}/${m}/${y}`;
}

export function demoLocalTime(practiceDate, practiceTime, practiceZone, visitorZone) {
  const local = demoLocalParts(practiceDate, practiceTime, practiceZone, visitorZone);
  if (!local) return practiceTime;
  return `${local.time}${local.date === practiceDate ? '' : ` (${shortDate(local.date)})`}`;
}

export function demoLocalRange(practiceDate, start, end, practiceZone, visitorZone) {
  const a = demoLocalParts(practiceDate, start, practiceZone, visitorZone);
  const b = demoLocalParts(practiceDate, end, practiceZone, visitorZone);
  if (!a || !b) return `${start}–${end}`;
  if (a.date === b.date) return `${a.time}–${b.time}${a.date === practiceDate ? '' : ` (${shortDate(a.date)})`}`;
  return `${a.time} (${shortDate(a.date)})–${b.time} (${shortDate(b.date)})`;
}

export function demoLocalDayLabel(practiceDate, practiceTime, practiceZone, visitorZone) {
  const local = demoLocalParts(practiceDate, practiceTime, practiceZone, visitorZone);
  if (!local) return practiceDate;
  const instant = new Date(`${local.date}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(instant);
}
