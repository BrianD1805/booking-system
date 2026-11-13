import { NextRequest, NextResponse } from 'next/server';
import { getZipBookDatabase } from '@/lib/dbProvider';
import { requireAdminStaff } from '@/lib/adminStaffAuth';
import { getDefaultPracticeId } from '@/lib/tenant';
import { invalidateBootstrapCache, writeAdminAuditLog } from '@/lib/db';
import { dayOfWeek, insideHours, minutes, crossesLunch } from '@/lib/schedulingPolicy.mjs';
import { getPracticeToday } from '@/lib/bookingTime.mjs';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const PRACTICE_ID = getDefaultPracticeId();
const DAY_VALUES = new Set([0, 1, 2, 3, 4, 5, 6]);

type PracticeSettingsRow = {
  id: string;
  name: string;
  public_display_name: string | null;
  booking_subdomain: string;
  practice_address: string | null;
  practice_phone: string | null;
  practice_email: string | null;
  logo_url: string | null;
  working_days: number[];
  working_start_time: string;
  working_end_time: string;
  slot_interval_minutes: number;
  minimum_notice_hours: number;
  max_booking_ahead_days: number;
  lunch_break_enabled: boolean | null;
  lunch_break_start: string | null;
  lunch_break_end: string | null;
  allow_same_day_bookings: boolean | null;
  cancellation_policy_note: string | null;
  tenant_slug: string | null;
  public_booking_path: string | null;
  client_app_url: string | null;
  admin_app_url: string | null;
  timezone: string | null;
  locale: string | null;
  currency_code: string | null;
  country_code: string | null;
};

type ProcedureRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_guide: string | null;
  active: boolean;
  display_order: number;
};

type PractitionerRow = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  display_order: number;
};

type PractitionerProcedureRow = { practitioner_id: string; procedure_id: string };
type WorkingHourRow = { practitioner_id: string; day_of_week: number; start_time: string; end_time: string; active: boolean; lunch_break_enabled: boolean; lunch_break_start: string; lunch_break_end: string };
type LeaveRow = { id: string; practitioner_id: string; blocked_date: string; start_time: string; end_time: string; reason: string; series_id: string | null };

// The request body is untyped JSON. Give normalized weekly diary entries a
// concrete type so schedule lookups and audit snapshots remain type-safe.
type PractitionerScheduleDay = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
  lunchBreakEnabled: boolean;
  lunchBreakStart: string;
  lunchBreakEnd: string;
};


function normaliseText(value: unknown) {
  return String(value ?? '').trim();
}

function normaliseTime(value: unknown, fallback: string) {
  const text = normaliseText(value) || fallback;
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback;
}

function normaliseInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normaliseWorkingDays(value: unknown) {
  const list = Array.isArray(value) ? value : [];
  const days = Array.from(new Set(list.map((item) => Number(item)).filter((item) => DAY_VALUES.has(item)))).sort((a, b) => a - b);
  return days.length ? days : [1, 2, 3, 4, 5];
}

function checkedTime(value: unknown, label: string) {
  const time = normaliseText(value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Enter a valid ${label}.`);
  return time;
}

function validateWindow(start: string, end: string, label: string) {
  if (!(minutes(start) < minutes(end))) throw new Error(`${label}: end time must be after start time.`);
}

function validateLunch(enabled: boolean, from: string, until: string, start: string, end: string, label: string) {
  if (!enabled) return;
  validateWindow(start, end, `${label} lunch`);
  if (!insideHours(start, end, from, until)) throw new Error(`${label}: lunch must fall within working hours.`);
}

function validDate(value: unknown, label: string) {
  const text = normaliseText(value);
  if (dayOfWeek(text) < 0) throw new Error(`Choose a valid ${label}.`);
  return text;
}

function invalidateSettings() {
  clearSettingsCache();
  invalidateBootstrapCache();
}

function makeId(prefix: string, label: string) {
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'item';
  return `${prefix}-${safe}-${Date.now().toString(36)}`;
}

function mapSettings(row: PracticeSettingsRow) {
  return {
    practiceId: row.id,
    practiceName: row.name,
    publicDisplayName: row.public_display_name ?? row.name,
    bookingSubdomain: row.booking_subdomain,
    address: row.practice_address ?? '',
    phone: row.practice_phone ?? '',
    email: row.practice_email ?? '',
    logoUrl: row.logo_url ?? '',
    workingDays: row.working_days ?? [1, 2, 3, 4, 5],
    workingStartTime: String(row.working_start_time).slice(0, 5),
    workingEndTime: String(row.working_end_time).slice(0, 5),
    slotIntervalMinutes: Number(row.slot_interval_minutes ?? 30),
    minimumNoticeHours: Number(row.minimum_notice_hours ?? 2),
    maxBookingAheadDays: Number(row.max_booking_ahead_days ?? 90),
    lunchBreakEnabled: Boolean(row.lunch_break_enabled),
    lunchBreakStart: row.lunch_break_start ? String(row.lunch_break_start).slice(0, 5) : '13:00',
    lunchBreakEnd: row.lunch_break_end ? String(row.lunch_break_end).slice(0, 5) : '14:00',
    allowSameDayBookings: row.allow_same_day_bookings !== false,
    cancellationPolicyNote: row.cancellation_policy_note ?? '',
    tenantSlug: row.tenant_slug ?? 'zippy-dental-demo',
    publicBookingPath: row.public_booking_path ?? '/book',
    clientAppUrl: row.client_app_url ?? 'https://zipbook.app/book',
    adminAppUrl: row.admin_app_url ?? 'https://admin.zipbook.app',
    timezone: row.timezone ?? 'Africa/Nairobi',
    locale: row.locale ?? 'en-GB',
    currencyCode: row.currency_code ?? 'KES',
    countryCode: row.country_code ?? 'KE'
  };
}

function mapProcedure(row: ProcedureRow) {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: Number(row.duration_minutes),
    priceGuide: row.price_guide ?? '',
    active: row.active,
    displayOrder: Number(row.display_order ?? 0)
  };
}

function mapPractitioner(row: PractitionerRow, assignments: PractitionerProcedureRow[]) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    active: row.active,
    displayOrder: Number(row.display_order ?? 0),
    procedureIds: assignments.filter((item) => item.practitioner_id === row.id).map((item) => item.procedure_id)
  };
}


type PracticeSettingsPayload = Awaited<ReturnType<typeof loadSettingsUncached>>;
// A different serverless instance may have saved practitioner hours or leave.
const SETTINGS_CACHE_TTL_MS = 0;
let cachedSettings: { data: PracticeSettingsPayload; expiresAt: number } | null = null;

function cloneSettingsPayload(data: PracticeSettingsPayload): PracticeSettingsPayload {
  return JSON.parse(JSON.stringify(data)) as PracticeSettingsPayload;
}

function clearSettingsCache() {
  cachedSettings = null;
}

function groupLeaveRows(rows: LeaveRow[]) {
  const groups = new Map<string, { id: string; practitionerId: string; startDate: string; endDate: string; startTime: string; endTime: string; reason: string; days: number }>();
  for (const row of rows) {
    const key = row.series_id || row.id;
    const date = row.blocked_date.slice(0, 10);
    const entry = groups.get(key);
    if (entry) {
      if (date < entry.startDate) entry.startDate = date;
      if (date > entry.endDate) entry.endDate = date;
      entry.days += 1;
    } else groups.set(key, { id: key, practitionerId: row.practitioner_id, startDate: date, endDate: date, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), reason: row.reason, days: 1 });
  }
  return [...groups.values()].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

async function loadSettingsUncached() {
  const database = getZipBookDatabase();
  const [practiceRows, procedureRows, practitionerRows, assignmentRows, hourRows, leaveRows] = await Promise.all([
    database.sql<PracticeSettingsRow>`SELECT id, name, public_display_name, booking_subdomain, practice_address, practice_phone, practice_email, logo_url, working_days, working_start_time::text AS working_start_time, working_end_time::text AS working_end_time, slot_interval_minutes, minimum_notice_hours, max_booking_ahead_days, lunch_break_enabled, lunch_break_start::text AS lunch_break_start, lunch_break_end::text AS lunch_break_end, allow_same_day_bookings, cancellation_policy_note, tenant_slug, public_booking_path, client_app_url, admin_app_url, timezone, locale, currency_code, country_code FROM practices WHERE id = ${PRACTICE_ID} LIMIT 1`,
    database.sql<ProcedureRow>`SELECT id, name, duration_minutes, price_guide, active, display_order FROM procedures WHERE practice_id = ${PRACTICE_ID} ORDER BY display_order, name`,
    database.sql<PractitionerRow>`SELECT id, name, role, active, display_order FROM practitioners WHERE practice_id = ${PRACTICE_ID} ORDER BY display_order, name`,
    database.sql<PractitionerProcedureRow>`SELECT pp.practitioner_id, pp.procedure_id FROM practitioner_procedures pp JOIN practitioners p ON p.id = pp.practitioner_id WHERE p.practice_id = ${PRACTICE_ID} ORDER BY pp.practitioner_id, pp.procedure_id`,
    database.sql<WorkingHourRow>`SELECT h.practitioner_id, h.day_of_week, h.start_time::text AS start_time, h.end_time::text AS end_time, h.active, h.lunch_break_enabled, h.lunch_break_start::text AS lunch_break_start, h.lunch_break_end::text AS lunch_break_end FROM practitioner_working_hours h JOIN practitioners p ON p.id = h.practitioner_id WHERE p.practice_id = ${PRACTICE_ID} ORDER BY h.practitioner_id, h.day_of_week`,
    database.sql<LeaveRow>`SELECT b.id, b.practitioner_id, b.blocked_date::text AS blocked_date, b.start_time::text AS start_time, b.end_time::text AS end_time, b.reason, b.series_id FROM practitioner_blocked_times b JOIN practitioners p ON p.id = b.practitioner_id WHERE p.practice_id = ${PRACTICE_ID} ORDER BY b.blocked_date DESC`
  ]);

  if (!practiceRows[0]) throw new Error('Practice settings were not found.');

  return {
    settings: mapSettings(practiceRows[0]),
    procedures: procedureRows.map(mapProcedure),
    practitioners: practitionerRows.map((row) => mapPractitioner(row, assignmentRows)),
    workingHours: hourRows.map((row) => ({ practitionerId: row.practitioner_id, dayOfWeek: row.day_of_week, startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), active: row.active, lunchBreakEnabled: row.lunch_break_enabled, lunchBreakStart: row.lunch_break_start.slice(0, 5), lunchBreakEnd: row.lunch_break_end.slice(0, 5) })),
    leave: groupLeaveRows(leaveRows)
  };
}

async function loadSettings() {
  const now = Date.now();
  if (cachedSettings && cachedSettings.expiresAt > now) {
    return cloneSettingsPayload(cachedSettings.data);
  }

  const data = await loadSettingsUncached();
  cachedSettings = { data: cloneSettingsPayload(data), expiresAt: now + SETTINGS_CACHE_TTL_MS };
  return data;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminStaff(request);
    return NextResponse.json(await loadSettings());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load practice settings.' }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { actor } = await requireAdminStaff(request);
    const body = await request.json();
    const database = getZipBookDatabase();
    const settings = body.settings ?? body;
    if (body.section === 'profile') {
      const practiceName = normaliseText(settings.practiceName);
      if (!practiceName) throw new Error('Enter a practice name.');
      const publicDisplayName = normaliseText(settings.publicDisplayName) || practiceName;
      const address = normaliseText(settings.address);
      const phone = normaliseText(settings.phone);
      const email = normaliseText(settings.email);
      const logoUrl = normaliseText(settings.logoUrl);
      const timezone = normaliseText(settings.timezone) || 'Africa/Nairobi';
      try { new Intl.DateTimeFormat('en-GB', { timeZone: timezone }).format(); } catch { throw new Error('Enter a valid IANA timezone, for example Europe/London.'); }
      const currencyCode = normaliseText(settings.currencyCode).toUpperCase();
      const countryCode = normaliseText(settings.countryCode).toUpperCase();
      if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error('Currency must be a three-letter code, for example GBP.');
      if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error('Country must be a two-letter code, for example GB.');
      await database.sql`UPDATE practices SET name=${practiceName},public_display_name=${publicDisplayName},practice_address=${address},practice_phone=${phone},practice_email=${email},logo_url=${logoUrl},timezone=${timezone},currency_code=${currencyCode},country_code=${countryCode},updated_at=NOW() WHERE id=${PRACTICE_ID}`;
      await writeAdminAuditLog({ action: 'practice_profile_updated', entityType: 'practice', entityId: PRACTICE_ID, source: 'admin', actor });
      invalidateSettings();
      return NextResponse.json(await loadSettings());
    }
    if (body.section === 'hours') {
      const workingDays = normaliseWorkingDays(settings.workingDays);
      const start = checkedTime(settings.workingStartTime, 'opening time');
      const end = checkedTime(settings.workingEndTime, 'closing time');
      validateWindow(start, end, 'Practice hours');
      const lunchEnabled = settings.lunchBreakEnabled === true;
      const lunchStart = checkedTime(settings.lunchBreakStart, 'lunch start');
      const lunchEnd = checkedTime(settings.lunchBreakEnd, 'lunch end');
      validateLunch(lunchEnabled, start, end, lunchStart, lunchEnd, 'Practice');
      const previous = await database.sql<{ working_start_time: string; working_end_time: string }>`SELECT working_start_time::text AS working_start_time, working_end_time::text AS working_end_time FROM practices WHERE id=${PRACTICE_ID}`;
      const currentToday = getPracticeToday(new Date(), normaliseText((await database.sql<{ timezone: string }>`SELECT timezone FROM practices WHERE id=${PRACTICE_ID}`)[0]?.timezone) || 'Africa/Nairobi');
      const existing = await database.sql<{ booking_date: string; start_time: string; end_time: string }>`
        SELECT booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time
        FROM bookings WHERE practice_id=${PRACTICE_ID} AND booking_date >= ${currentToday}::date AND status <> 'cancelled'
      `;
      const conflict = existing.find((booking) =>
        !workingDays.includes(dayOfWeek(booking.booking_date.slice(0,10))) ||
        !insideHours(booking.start_time, booking.end_time, start, end) ||
        crossesLunch(booking.start_time, booking.end_time, lunchEnabled, lunchStart, lunchEnd)
      );
      if (conflict) throw new Error(`Existing bookings would fall outside these practice hours (first: ${conflict.booking_date.slice(0,10)}). Reschedule them before changing the hours.`);
      await database.sql`UPDATE practices SET working_days=${workingDays},working_start_time=${start}::time,working_end_time=${end}::time,lunch_break_enabled=${lunchEnabled},lunch_break_start=${lunchStart}::time,lunch_break_end=${lunchEnd}::time,updated_at=NOW() WHERE id=${PRACTICE_ID}`;
      // Only carry across schedule times that matched the old whole-practice boundary.
      // Bespoke practitioner start/finish times are preserved.
      if (body.syncAllPractitionerHours === true) {
        await database.sql`UPDATE practitioner_working_hours h SET start_time=${start}::time, end_time=${end}::time FROM practitioners p WHERE h.practitioner_id=p.id AND p.practice_id=${PRACTICE_ID} AND h.active=TRUE`;
      }
      if (body.adjustMatchingSchedules === true && body.syncAllPractitionerHours !== true && previous[0]) {
        const oldOpen = previous[0].working_start_time.slice(0, 5);
        const oldClose = previous[0].working_end_time.slice(0, 5);
        if (oldOpen !== start) await database.sql`UPDATE practitioner_working_hours h SET start_time=${start}::time FROM practitioners p WHERE h.practitioner_id=p.id AND p.practice_id=${PRACTICE_ID} AND h.start_time=${oldOpen}::time AND h.end_time > ${start}::time`;
        if (oldClose !== end) await database.sql`UPDATE practitioner_working_hours h SET end_time=${end}::time FROM practitioners p WHERE h.practitioner_id=p.id AND p.practice_id=${PRACTICE_ID} AND h.end_time=${oldClose}::time AND h.start_time < ${end}::time`;
      }
      await writeAdminAuditLog({ action: 'practice_hours_updated', entityType: 'practice', entityId: PRACTICE_ID, source: 'admin', actor, details: { workingDays, start, end, lunchEnabled, adjustedPractitionerBoundaries: body.adjustMatchingSchedules === true } });
      invalidateSettings();
      return NextResponse.json(await loadSettings());
    }
    if (body.section === 'rules') {
      const slotInterval = normaliseInteger(settings.slotIntervalMinutes,30,5,120);
      const minNotice = normaliseInteger(settings.minimumNoticeHours,2,0,720);
      const maxAhead = normaliseInteger(settings.maxBookingAheadDays,90,1,730);
      const sameDay = settings.allowSameDayBookings !== false;
      const note = normaliseText(settings.cancellationPolicyNote);
      await database.sql`UPDATE practices SET slot_interval_minutes=${slotInterval},minimum_notice_hours=${minNotice},max_booking_ahead_days=${maxAhead},allow_same_day_bookings=${sameDay},cancellation_policy_note=${note},updated_at=NOW() WHERE id=${PRACTICE_ID}`;
      await writeAdminAuditLog({ action: 'practice_booking_rules_updated', entityType: 'practice', entityId: PRACTICE_ID, source: 'admin', actor, details: { slotInterval, minNotice, maxAhead, sameDay } });
      invalidateSettings();
      return NextResponse.json(await loadSettings());
    }

    const practiceName = normaliseText(settings.practiceName || settings.name) || 'Zippy Dental Demo';
    const publicDisplayName = normaliseText(settings.publicDisplayName) || practiceName;
    const address = normaliseText(settings.address);
    const phone = normaliseText(settings.phone);
    const email = normaliseText(settings.email);
    const logoUrl = normaliseText(settings.logoUrl);
    const timezone = normaliseText(settings.timezone) || 'Africa/Nairobi';
    const currencyCode = normaliseText(settings.currencyCode).toUpperCase() || 'KES';
    const countryCode = normaliseText(settings.countryCode).toUpperCase() || 'KE';
    const workingDays = normaliseWorkingDays(settings.workingDays);
    const workingStartTime = normaliseTime(settings.workingStartTime, '08:30');
    const workingEndTime = normaliseTime(settings.workingEndTime, '17:00');
    const slotIntervalMinutes = normaliseInteger(settings.slotIntervalMinutes, 30, 5, 120);
    const minimumNoticeHours = normaliseInteger(settings.minimumNoticeHours, 2, 0, 720);
    const maxBookingAheadDays = normaliseInteger(settings.maxBookingAheadDays, 90, 1, 730);
    const lunchBreakEnabled = Boolean(settings.lunchBreakEnabled);
    const lunchBreakStart = normaliseTime(settings.lunchBreakStart, '13:00');
    const lunchBreakEnd = normaliseTime(settings.lunchBreakEnd, '14:00');
    const allowSameDayBookings = settings.allowSameDayBookings !== false;
    const cancellationPolicyNote = normaliseText(settings.cancellationPolicyNote);

    await database.sql`
      UPDATE practices
      SET name = ${practiceName},
          public_display_name = ${publicDisplayName},
          practice_address = ${address},
          practice_phone = ${phone},
          practice_email = ${email},
          logo_url = ${logoUrl},
          timezone = ${timezone},
          currency_code = ${currencyCode},
          country_code = ${countryCode},
          working_days = ${workingDays},
          working_start_time = ${workingStartTime}::time,
          working_end_time = ${workingEndTime}::time,
          slot_interval_minutes = ${slotIntervalMinutes},
          minimum_notice_hours = ${minimumNoticeHours},
          max_booking_ahead_days = ${maxBookingAheadDays},
          lunch_break_enabled = ${lunchBreakEnabled},
          lunch_break_start = ${lunchBreakStart}::time,
          lunch_break_end = ${lunchBreakEnd}::time,
          allow_same_day_bookings = ${allowSameDayBookings},
          cancellation_policy_note = ${cancellationPolicyNote},
          updated_at = NOW()
      WHERE id = ${PRACTICE_ID}
    `;

    await writeAdminAuditLog({
      action: 'practice_settings_updated',
      entityType: 'practice',
      entityId: PRACTICE_ID,
      source: 'admin',
      actor,
      details: { practiceName, publicDisplayName, workingDays, workingStartTime, workingEndTime, slotIntervalMinutes, minimumNoticeHours, maxBookingAheadDays }
    });

    invalidateSettings();
    return NextResponse.json(await loadSettings());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save practice settings.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { actor } = await requireAdminStaff(request);
    const body = await request.json();
    const database = getZipBookDatabase();
    const type = normaliseText(body.type);

    if (type === 'practitioner-schedule') {
      const practitionerId = normaliseText(body.practitionerId);
      const owned = await database.sql<{ id: string }>`SELECT id FROM practitioners WHERE id=${practitionerId} AND practice_id=${PRACTICE_ID}`;
      if (!owned[0]) throw new Error('Practitioner not found in this practice.');
      if (!Array.isArray(body.days) || body.days.length !== 7) throw new Error('Enter a schedule for all seven days.');
      const uniqueDays = new Set<number>();
      const normalized: PractitionerScheduleDay[] = (body.days as Record<string, unknown>[]).map((day: Record<string, unknown>): PractitionerScheduleDay => {
        const weekday = Number(day.dayOfWeek);
        if (!DAY_VALUES.has(weekday) || uniqueDays.has(weekday)) throw new Error('Each weekday must appear exactly once.');
        uniqueDays.add(weekday);
        const startTime = checkedTime(day.startTime,'practitioner start time');
        const endTime = checkedTime(day.endTime,'practitioner finish time');
        const lunchBreakEnabled = day.lunchBreakEnabled === true;
        const lunchBreakStart = checkedTime(day.lunchBreakStart,'practitioner lunch start');
        const lunchBreakEnd = checkedTime(day.lunchBreakEnd,'practitioner lunch end');
        const active = day.active === true;
        if (active) {
          validateWindow(startTime,endTime,'Practitioner hours');
          validateLunch(lunchBreakEnabled,startTime,endTime,lunchBreakStart,lunchBreakEnd,'Practitioner');
        }
        return { id: `pwh-${randomUUID()}`, dayOfWeek: weekday, startTime, endTime, active, lunchBreakEnabled, lunchBreakStart, lunchBreakEnd };
      });
      const practiceTimezoneRow = await database.sql<{ timezone: string | null }>`SELECT timezone FROM practices WHERE id=${PRACTICE_ID}`;
      const currentToday = getPracticeToday(new Date(), practiceTimezoneRow[0]?.timezone ?? 'Africa/Nairobi');
      const existingBookings = await database.sql<{ booking_date: string; start_time: string; end_time: string }>`
        SELECT booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time
        FROM bookings WHERE practice_id=${PRACTICE_ID} AND practitioner_id=${practitionerId} AND booking_date >= ${currentToday}::date AND status <> 'cancelled'
      `;
      const conflict = existingBookings.find((booking) => {
        const rule = normalized.find((day) => day.dayOfWeek === dayOfWeek(booking.booking_date.slice(0,10)));
        return !rule || !rule.active || !insideHours(booking.start_time,booking.end_time,rule.startTime,rule.endTime) ||
          crossesLunch(booking.start_time,booking.end_time,rule.lunchBreakEnabled,rule.lunchBreakStart,rule.lunchBreakEnd);
      });
      if (conflict) throw new Error(`This schedule would block an existing booking on ${conflict.booking_date.slice(0,10)}. Reschedule it before saving.`);
      const scheduleJson = JSON.stringify(normalized);
      // One atomic SQL statement replaces a full weekly schedule without a partial week.
      await database.sql`
        WITH cleared AS (DELETE FROM practitioner_working_hours WHERE practitioner_id=${practitionerId} RETURNING id),
        removed AS (SELECT COUNT(*) AS n FROM cleared)
        INSERT INTO practitioner_working_hours
          (id,practitioner_id,day_of_week,start_time,end_time,active,lunch_break_enabled,lunch_break_start,lunch_break_end)
        SELECT d.id, ${practitionerId}, d."dayOfWeek", d."startTime"::time, d."endTime"::time, d.active,
               d."lunchBreakEnabled", d."lunchBreakStart"::time, d."lunchBreakEnd"::time
        FROM jsonb_to_recordset(${scheduleJson}::jsonb) AS d(id text,"dayOfWeek" integer,"startTime" text,"endTime" text,active boolean,"lunchBreakEnabled" boolean,"lunchBreakStart" text,"lunchBreakEnd" text)
        CROSS JOIN removed
      `;
      await writeAdminAuditLog({ action:'practitioner_schedule_updated', entityType:'practitioner',entityId:practitionerId, source:'admin', actor, details:{ days:normalized.map(({dayOfWeek,active,startTime,endTime,lunchBreakEnabled})=>({dayOfWeek,active,startTime,endTime,lunchBreakEnabled})) } });
      invalidateSettings();
      return NextResponse.json(await loadSettings());
    }
    if (type === 'practitioner-leave') {
      const practitionerId = normaliseText(body.practitionerId);
      const owned = await database.sql<{ id: string }>`SELECT id FROM practitioners WHERE id=${practitionerId} AND practice_id=${PRACTICE_ID}`;
      if (!owned[0]) throw new Error('Practitioner not found in this practice.');
      const startDate = validDate(body.startDate,'leave start date');
      const endDate = validDate(body.endDate,'leave end date');
      if (endDate < startDate) throw new Error('Leave end date must not be before its start date.');
      const numberOfDays = Math.round((Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`))/86400000)+1;
      if (numberOfDays > 92) throw new Error('A leave entry cannot cover more than 92 days. Add a second entry if needed.');
      const fullDay = body.fullDay !== false;
      const start = fullDay ? '00:00' : checkedTime(body.startTime,'leave start time');
      const end = fullDay ? '23:59' : checkedTime(body.endTime,'leave end time');
      validateWindow(start,end,'Leave');
      const reason = normaliseText(body.reason);
      if (!reason) throw new Error('Enter a reason, for example annual leave, sick leave or training.');
      const clashes = await database.sql<{ booking_date: string; count: number }>`
        SELECT booking_date::text AS booking_date,COUNT(*)::int AS count FROM bookings
        WHERE practice_id=${PRACTICE_ID} AND practitioner_id=${practitionerId}
          AND booking_date BETWEEN ${startDate}::date AND ${endDate}::date
          AND status <> 'cancelled' AND start_time < ${end}::time AND ${start}::time < end_time
        GROUP BY booking_date ORDER BY booking_date LIMIT 1
      `;
      if (clashes[0]) throw new Error(`Existing appointments overlap this leave (first clash: ${clashes[0].booking_date.slice(0,10)}). Reschedule those appointments before recording leave.`);
      const seriesId = `leave-${randomUUID()}`;
      await database.sql`
        INSERT INTO practitioner_blocked_times (id,practitioner_id,blocked_date,start_time,end_time,reason,series_id)
        SELECT ${seriesId} || '-' || TO_CHAR(d::date,'YYYYMMDD'),${practitionerId},d::date,${start}::time,${end}::time,${reason},${seriesId}
        FROM generate_series(${startDate}::date,${endDate}::date,interval '1 day') AS d
      `;
      await writeAdminAuditLog({ action:'practitioner_leave_added',entityType:'practitioner',entityId:practitionerId,source:'admin',actor,details:{startDate,endDate,fullDay,reason,days:numberOfDays} });
      invalidateSettings();
      return NextResponse.json(await loadSettings());
    }

    if (type === 'procedure') {
      const name = normaliseText(body.name);
      if (!name) throw new Error('Procedure name is required.');
      const id = normaliseText(body.id) || makeId('procedure', name);
      if (body.id) {
        const owned = await database.sql<{ id: string }>`SELECT id FROM procedures WHERE practice_id=${PRACTICE_ID} AND id=${id}`;
        if (!owned[0]) throw new Error('Procedure not found in this practice.');
      }
      const durationMinutes = normaliseInteger(body.durationMinutes, 30, 5, 360);
      const priceGuide = normaliseText(body.priceGuide);
      const active = body.active !== false;
      const displayOrder = normaliseInteger(body.displayOrder, 0, 0, 9999);

      await database.sql`
        INSERT INTO procedures (id, practice_id, name, duration_minutes, price_guide, active, display_order)
        VALUES (${id}, ${PRACTICE_ID}, ${name}, ${durationMinutes}, ${priceGuide}, ${active}, ${displayOrder})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, duration_minutes = EXCLUDED.duration_minutes, price_guide = EXCLUDED.price_guide, active = EXCLUDED.active, display_order = EXCLUDED.display_order, updated_at = NOW()
      `;
      await writeAdminAuditLog({ action: body.id ? 'procedure_updated' : 'procedure_added', entityType: 'procedure', entityId: id, source: 'admin', actor, details: { name, durationMinutes, active } });
      clearSettingsCache();
      invalidateSettings();
      return NextResponse.json(await loadSettings());
    }

    if (type === 'practitioner') {
      const name = normaliseText(body.name);
      if (!name) throw new Error('Practitioner name is required.');
      const id = normaliseText(body.id) || makeId('practitioner', name);
      if (body.id) {
        const owned = await database.sql<{ id: string }>`SELECT id FROM practitioners WHERE practice_id=${PRACTICE_ID} AND id=${id}`;
        if (!owned[0]) throw new Error('Practitioner not found in this practice.');
      }
      const role = normaliseText(body.role) || 'Dentist';
      const active = body.active !== false;
      const displayOrder = normaliseInteger(body.displayOrder, 0, 0, 9999);
      const procedureIds: string[] = Array.isArray(body.procedureIds) ? body.procedureIds.map(normaliseText).filter(Boolean) : [];
      if (procedureIds.length) {
        const allowed = await database.sql<{ id: string }>`SELECT id FROM procedures WHERE practice_id=${PRACTICE_ID}`;
        const allowedIds = new Set(allowed.map((row) => row.id));
        if (procedureIds.some((procedureId) => !allowedIds.has(procedureId))) throw new Error('A selected procedure does not belong to this practice.');
      }

      await database.sql`
        INSERT INTO practitioners (id, practice_id, name, role, active, display_order)
        VALUES (${id}, ${PRACTICE_ID}, ${name}, ${role}, ${active}, ${displayOrder})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, active = EXCLUDED.active, display_order = EXCLUDED.display_order, updated_at = NOW()
      `;
      await database.sql`DELETE FROM practitioner_procedures WHERE practitioner_id = ${id}`;
      for (const procedureId of procedureIds) {
        await database.sql`INSERT INTO practitioner_procedures (practitioner_id, procedure_id) VALUES (${id}, ${procedureId}) ON CONFLICT (practitioner_id, procedure_id) DO NOTHING`;
      }
      if (!body.id) {
        // New clinicians receive a default weekly pattern matching practice hours.
        await database.sql`
          INSERT INTO practitioner_working_hours (id, practitioner_id, day_of_week, start_time, end_time, active)
          SELECT ${id} || '-initial-' || day::text, ${id}, day, p.working_start_time, p.working_end_time, day = ANY(p.working_days)
          FROM practices p CROSS JOIN generate_series(0,6) AS day WHERE p.id=${PRACTICE_ID}
          ON CONFLICT (id) DO NOTHING
        `;
      }
      await writeAdminAuditLog({ action: body.id ? 'practitioner_updated' : 'practitioner_added', entityType: 'practitioner', entityId: id, source: 'admin', actor, details: { name, role, active, procedureIds } });
      invalidateSettings();
      return NextResponse.json(await loadSettings());
    }

    throw new Error('Unknown settings item type.');
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save settings item.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { actor } = await requireAdminStaff(request);
    const { searchParams } = new URL(request.url);
    const type = normaliseText(searchParams.get('type'));
    const id = normaliseText(searchParams.get('id'));
    if (!id) throw new Error('Missing item id.');
    const database = getZipBookDatabase();

    if (type === 'leave') {
      const practitionerId = normaliseText(searchParams.get('practitionerId'));
      const owned = await database.sql<{ id: string }>`SELECT id FROM practitioners WHERE id=${practitionerId} AND practice_id=${PRACTICE_ID}`;
      if (!owned[0]) throw new Error('Practitioner not found.');
      const deleted = await database.sql<{ id: string }>`DELETE FROM practitioner_blocked_times WHERE practitioner_id=${practitionerId} AND (series_id=${id} OR (series_id IS NULL AND id=${id})) RETURNING id`;
      if (!deleted.length) throw new Error('Leave entry not found.');
      await writeAdminAuditLog({ action:'practitioner_leave_removed',entityType:'practitioner',entityId:practitionerId,source:'admin',actor,details:{entryId:id,daysRemoved:deleted.length} });
      invalidateSettings();
      return NextResponse.json(await loadSettings());
    }

    if (type === 'procedure') {
      const owned = await database.sql<{ id: string }>`SELECT id FROM procedures WHERE id=${id} AND practice_id=${PRACTICE_ID}`;
      if (!owned[0]) throw new Error('Procedure not found in this practice.');
      const bookingRows = await database.sql<{ count: number }>`SELECT COUNT(*)::int AS count FROM bookings WHERE practice_id = ${PRACTICE_ID} AND procedure_id = ${id}`;
      if (Number(bookingRows[0]?.count ?? 0) > 0) {
        await database.sql`UPDATE procedures SET active = FALSE, updated_at = NOW() WHERE practice_id = ${PRACTICE_ID} AND id = ${id}`;
        await writeAdminAuditLog({ action: 'procedure_deactivated', entityType: 'procedure', entityId: id, source: 'admin', actor, details: { reason: 'Existing bookings reference this procedure.' } });
      } else {
        await database.sql`DELETE FROM practitioner_procedures WHERE procedure_id = ${id}`;
        await database.sql`DELETE FROM procedures WHERE practice_id = ${PRACTICE_ID} AND id = ${id}`;
        await writeAdminAuditLog({ action: 'procedure_deleted', entityType: 'procedure', entityId: id, source: 'admin', actor });
      }
      return NextResponse.json(await loadSettings());
    }

    if (type === 'practitioner') {
      const owned = await database.sql<{ id: string }>`SELECT id FROM practitioners WHERE id=${id} AND practice_id=${PRACTICE_ID}`;
      if (!owned[0]) throw new Error('Practitioner not found in this practice.');
      const bookingRows = await database.sql<{ count: number }>`SELECT COUNT(*)::int AS count FROM bookings WHERE practice_id = ${PRACTICE_ID} AND practitioner_id = ${id}`;
      if (Number(bookingRows[0]?.count ?? 0) > 0) {
        await database.sql`UPDATE practitioners SET active = FALSE, updated_at = NOW() WHERE practice_id = ${PRACTICE_ID} AND id = ${id}`;
        await writeAdminAuditLog({ action: 'practitioner_deactivated', entityType: 'practitioner', entityId: id, source: 'admin', actor, details: { reason: 'Existing bookings reference this practitioner.' } });
      } else {
        await database.sql`DELETE FROM practitioner_procedures WHERE practitioner_id = ${id}`;
        await database.sql`DELETE FROM practitioner_working_hours WHERE practitioner_id = ${id}`;
        await database.sql`DELETE FROM practitioner_blocked_times WHERE practitioner_id = ${id}`;
        await database.sql`DELETE FROM practitioners WHERE practice_id = ${PRACTICE_ID} AND id = ${id}`;
        await writeAdminAuditLog({ action: 'practitioner_deleted', entityType: 'practitioner', entityId: id, source: 'admin', actor });
      }
      invalidateSettings();
      return NextResponse.json(await loadSettings());
    }

    throw new Error('Unknown delete type.');
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete settings item.' }, { status: 400 });
  }
}
