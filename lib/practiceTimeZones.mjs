// Canonical IANA practice timezones. Do not derive practice times from the browser timezone.
const ESSENTIAL_ZONES = ['UTC', 'Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Africa/Nairobi', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland', 'America/New_York', 'America/Chicago', 'America/Los_Angeles'];
export function isValidPracticeTimeZone(zone) {
  if (typeof zone !== 'string' || !zone || zone.length > 100) return false;
  try { new Intl.DateTimeFormat('en-GB', { timeZone: zone }); return true; } catch { return false; }
}
export function practiceTimeZoneOptions(selected = '') {
  let supported = [];
  try { supported = Intl.supportedValuesOf('timeZone'); } catch { /* older browser fallback */ }
  return [...new Set([...ESSENTIAL_ZONES, ...supported, selected].filter(isValidPracticeTimeZone))]
    .sort((a,b)=>a.localeCompare(b,'en-GB'))
    .map(value=>({ value, label: value.replace(/_/g,' '), description: value.split('/')[0] === 'UTC' ? 'Universal time' : value.split('/')[0] }));
}
