import { NextRequest, NextResponse } from 'next/server';
import { getZipBookDatabase } from '@/lib/dbProvider';
import { requireAdminStaff } from '@/lib/adminStaffAuth';
import { getDefaultPracticeId } from '@/lib/tenant';
import { writeAdminAuditLog } from '@/lib/db';

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
const SETTINGS_CACHE_TTL_MS = 60_000;
let cachedSettings: { data: PracticeSettingsPayload; expiresAt: number } | null = null;

function cloneSettingsPayload(data: PracticeSettingsPayload): PracticeSettingsPayload {
  return JSON.parse(JSON.stringify(data)) as PracticeSettingsPayload;
}

function clearSettingsCache() {
  cachedSettings = null;
}

async function loadSettingsUncached() {
  const database = getZipBookDatabase();
  const [practiceRows, procedureRows, practitionerRows, assignmentRows] = await Promise.all([
    database.sql<PracticeSettingsRow>`SELECT id, name, public_display_name, booking_subdomain, practice_address, practice_phone, practice_email, logo_url, working_days, working_start_time::text AS working_start_time, working_end_time::text AS working_end_time, slot_interval_minutes, minimum_notice_hours, max_booking_ahead_days, lunch_break_enabled, lunch_break_start::text AS lunch_break_start, lunch_break_end::text AS lunch_break_end, allow_same_day_bookings, cancellation_policy_note, tenant_slug, public_booking_path, client_app_url, admin_app_url, timezone, locale, currency_code, country_code FROM practices WHERE id = ${PRACTICE_ID} LIMIT 1`,
    database.sql<ProcedureRow>`SELECT id, name, duration_minutes, price_guide, active, display_order FROM procedures WHERE practice_id = ${PRACTICE_ID} ORDER BY display_order, name`,
    database.sql<PractitionerRow>`SELECT id, name, role, active, display_order FROM practitioners WHERE practice_id = ${PRACTICE_ID} ORDER BY display_order, name`,
    database.sql<PractitionerProcedureRow>`SELECT practitioner_id, procedure_id FROM practitioner_procedures ORDER BY practitioner_id, procedure_id`
  ]);

  if (!practiceRows[0]) throw new Error('Practice settings were not found.');

  return {
    settings: mapSettings(practiceRows[0]),
    procedures: procedureRows.map(mapProcedure),
    practitioners: practitionerRows.map((row) => mapPractitioner(row, assignmentRows))
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

    clearSettingsCache();
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

    if (type === 'procedure') {
      const name = normaliseText(body.name);
      if (!name) throw new Error('Procedure name is required.');
      const id = normaliseText(body.id) || makeId('procedure', name);
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
      return NextResponse.json(await loadSettings());
    }

    if (type === 'practitioner') {
      const name = normaliseText(body.name);
      if (!name) throw new Error('Practitioner name is required.');
      const id = normaliseText(body.id) || makeId('practitioner', name);
      const role = normaliseText(body.role) || 'Dentist';
      const active = body.active !== false;
      const displayOrder = normaliseInteger(body.displayOrder, 0, 0, 9999);
      const procedureIds = Array.isArray(body.procedureIds) ? body.procedureIds.map(normaliseText).filter(Boolean) : [];

      await database.sql`
        INSERT INTO practitioners (id, practice_id, name, role, active, display_order)
        VALUES (${id}, ${PRACTICE_ID}, ${name}, ${role}, ${active}, ${displayOrder})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, active = EXCLUDED.active, display_order = EXCLUDED.display_order, updated_at = NOW()
      `;
      await database.sql`DELETE FROM practitioner_procedures WHERE practitioner_id = ${id}`;
      for (const procedureId of procedureIds) {
        await database.sql`INSERT INTO practitioner_procedures (practitioner_id, procedure_id) VALUES (${id}, ${procedureId}) ON CONFLICT (practitioner_id, procedure_id) DO NOTHING`;
      }
      await writeAdminAuditLog({ action: body.id ? 'practitioner_updated' : 'practitioner_added', entityType: 'practitioner', entityId: id, source: 'admin', actor, details: { name, role, active, procedureIds } });
      clearSettingsCache();
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

    if (type === 'procedure') {
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
      clearSettingsCache();
      return NextResponse.json(await loadSettings());
    }

    throw new Error('Unknown delete type.');
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete settings item.' }, { status: 400 });
  }
}
