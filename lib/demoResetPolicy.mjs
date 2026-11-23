// Ver-0.063.4: platform-only demo reset boundary and editable default settings.
// Never infer demo status from a slug or business name. Production is deny-by-default.
export function demoResetAllowedIds(raw) {
  if (typeof raw !== 'string') return [];
  return [...new Set(raw.split(',').map(s => s.trim()).filter(id => id === 'practice_001' || /^practice-[0-9a-f-]{36}$/.test(id)))].slice(0, 20);
}

export const DEMO_SETTING_KEYS = Object.freeze([
  'workingDays', 'workingStartTime', 'workingEndTime', 'slotIntervalMinutes',
  'minimumNoticeHours', 'maxBookingAheadDays', 'lunchBreakEnabled',
  'lunchBreakStart', 'lunchBreakEnd', 'allowSameDayBookings',
  'cancellationPolicyNote', 'clientPhoneCountryCode'
]);

export function validateDemoSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid default settings.');
  const keys=Object.keys(input);
  if (keys.some(k => !DEMO_SETTING_KEYS.includes(k))) throw new Error('Unknown setting in demo defaults.');
  for (const key of DEMO_SETTING_KEYS) if (!(key in input)) throw new Error(`Missing demo setting: ${key}.`);
  const days = input.workingDays;
  if (!Array.isArray(days) || !days.length || days.length > 7 || days.some(day => !Number.isInteger(day) || day < 0 || day > 6) || new Set(days).size !== days.length) throw new Error('Select one or more valid working days.');
  const checkTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  for (const key of ['workingStartTime','workingEndTime','lunchBreakStart','lunchBreakEnd']) if (!checkTime(input[key])) throw new Error('Use times in HH:MM format.');
  const minutes = value => Number(value.slice(0,2))*60+Number(value.slice(3));
  if (minutes(input.workingStartTime) >= minutes(input.workingEndTime)) throw new Error('Opening time must be before closing time.');
  if (input.lunchBreakEnabled && (minutes(input.lunchBreakStart) >= minutes(input.lunchBreakEnd) || minutes(input.lunchBreakStart) < minutes(input.workingStartTime) || minutes(input.lunchBreakEnd) > minutes(input.workingEndTime))) throw new Error('Lunch must fall within opening hours.');
  const bounds = [['slotIntervalMinutes',5,120],['minimumNoticeHours',0,168],['maxBookingAheadDays',1,365]];
  for (const [key,low,high] of bounds) if (!Number.isInteger(input[key]) || input[key] < low || input[key] > high) throw new Error(`Invalid ${key}.`);
  if (input.slotIntervalMinutes % 5 !== 0) throw new Error('Slot interval must be in steps of five minutes.');
  if (typeof input.lunchBreakEnabled !== 'boolean' || typeof input.allowSameDayBookings !== 'boolean') throw new Error('Invalid toggle settings.');
  if (typeof input.cancellationPolicyNote !== 'string' || input.cancellationPolicyNote.length > 1000) throw new Error('Cancellation guidance must be 1000 characters or fewer.');
  if (typeof input.clientPhoneCountryCode !== 'string' || !/^[A-Z]{2}$/.test(input.clientPhoneCountryCode)) throw new Error('Use a two-letter phone country code.');
  return Object.fromEntries(DEMO_SETTING_KEYS.map(k=>[k,k==='workingDays'?[...days].sort((a,b)=>a-b):input[k]]));
}

export function assertDemoResetConfirmation(value, acknowledged) {
  if (value !== 'DELETE' || acknowledged !== true) throw new Error('Tick the confirmation box and type DELETE exactly.');
}
