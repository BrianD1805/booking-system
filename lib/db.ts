import { getDatabase } from '@netlify/database';
import { addMinutes } from '@/lib/availability';
import { procedureDuration, type BlockedDate, type BlockedTime, type Booking, type BookingSource, type BookingStatus, type BootstrapData, type PracticeSettings, type Procedure } from '@/lib/mockData';

const PRACTICE_ID = 'practice_001';

type PracticeRow = {
  id: string;
  name: string;
  booking_subdomain: string;
  working_days: number[];
  working_start_time: string;
  working_end_time: string;
  slot_interval_minutes: number;
  minimum_notice_hours: number;
  max_booking_ahead_days: number;
  fallback_sms: boolean;
  mobile_push: boolean;
  medical_data_mode: string;
};

type ProcedureRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price_guide: string | null;
};

type BookingRow = {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  procedure_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  source: BookingSource;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type BlockedDateRow = { blocked_date: string; reason: string };
type BlockedTimeRow = { id: string; blocked_date: string; start_time: string; end_time: string; reason: string };

function db() {
  return getDatabase();
}

function normaliseDate(value: string | Date) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Netlify Database/Postgres DATE values can arrive as ISO timestamps depending on the driver.
  // When they do, avoid timezone-shifted display by only trusting explicit YYYY-MM-DD strings.
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? value.slice(0, 10);
}

function normaliseTime(value: string) {
  return value.slice(0, 5);
}

function mapPractice(row: PracticeRow): PracticeSettings {
  return {
    practiceId: row.id,
    practiceName: row.name,
    bookingSubdomain: row.booking_subdomain,
    reminderOptions: ['1 day before', '1 hour before', 'Both'],
    workingDays: row.working_days,
    workingStartTime: normaliseTime(row.working_start_time),
    workingEndTime: normaliseTime(row.working_end_time),
    slotIntervalMinutes: row.slot_interval_minutes,
    minimumNoticeHours: row.minimum_notice_hours,
    maxBookingAheadDays: row.max_booking_ahead_days,
    fallbackSms: row.fallback_sms,
    mobilePush: row.mobile_push,
    medicalDataMode: row.medical_data_mode
  };
}

function mapProcedure(row: ProcedureRow): Procedure {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.duration_minutes,
    priceGuide: row.price_guide ?? undefined
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    patientEmail: row.patient_email,
    procedureId: row.procedure_id,
    date: normaliseDate(row.booking_date),
    time: normaliseTime(row.start_time),
    endTime: normaliseTime(row.end_time),
    status: row.status,
    source: row.source,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBlockedDate(row: BlockedDateRow): BlockedDate {
  return { date: normaliseDate(row.blocked_date), reason: row.reason };
}

function mapBlockedTime(row: BlockedTimeRow): BlockedTime {
  return {
    id: row.id,
    date: normaliseDate(row.blocked_date),
    startTime: normaliseTime(row.start_time),
    endTime: normaliseTime(row.end_time),
    reason: row.reason
  };
}

export async function getBootstrapData(): Promise<BootstrapData> {
  const database = db();
  const [practiceRows, procedureRows, blockedDateRows, blockedTimeRows] = await Promise.all([
    database.sql<PracticeRow>`SELECT * FROM practices WHERE id = ${PRACTICE_ID} LIMIT 1`,
    database.sql<ProcedureRow>`SELECT id, name, duration_minutes, price_guide FROM procedures WHERE practice_id = ${PRACTICE_ID} AND active = TRUE ORDER BY display_order, name`,
    database.sql<BlockedDateRow>`SELECT blocked_date::text AS blocked_date, reason FROM blocked_dates WHERE practice_id = ${PRACTICE_ID} ORDER BY blocked_date`,
    database.sql<BlockedTimeRow>`SELECT id, blocked_date::text AS blocked_date, start_time::text AS start_time, end_time::text AS end_time, reason FROM blocked_times WHERE practice_id = ${PRACTICE_ID} ORDER BY blocked_date, start_time`
  ]);

  if (!practiceRows[0]) throw new Error('Practice settings were not found. Check that the Netlify Database migration has run.');

  return {
    practiceSettings: mapPractice(practiceRows[0]),
    procedures: procedureRows.map(mapProcedure),
    blockedDates: blockedDateRows.map(mapBlockedDate),
    blockedTimes: blockedTimeRows.map(mapBlockedTime)
  };
}

export async function getBookings(date?: string): Promise<Booking[]> {
  const database = db();
  const rows = date
    ? await database.sql<BookingRow>`SELECT id, patient_name, patient_phone, patient_email, procedure_id, booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time, status, source, notes, created_at::text AS created_at, updated_at::text AS updated_at FROM bookings WHERE practice_id = ${PRACTICE_ID} AND booking_date = ${date}::date ORDER BY booking_date, start_time`
    : await database.sql<BookingRow>`SELECT id, patient_name, patient_phone, patient_email, procedure_id, booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time, status, source, notes, created_at::text AS created_at, updated_at::text AS updated_at FROM bookings WHERE practice_id = ${PRACTICE_ID} ORDER BY booking_date, start_time`;
  return rows.map(mapBooking);
}

export async function createBookingInDatabase(input: {
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  procedureId: string;
  date: string;
  time: string;
  source: BookingSource;
  notes?: string;
}): Promise<Booking> {
  const bootstrap = await getBootstrapData();
  const duration = procedureDuration(input.procedureId, bootstrap.procedures);
  const endTime = addMinutes(input.time, duration);
  const id = `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const database = db();

  const rows = await database.sql<BookingRow>`
    INSERT INTO bookings (
      id, practice_id, patient_name, patient_phone, patient_email, procedure_id,
      booking_date, start_time, end_time, status, source, notes
    ) VALUES (
      ${id}, ${PRACTICE_ID}, ${input.patientName}, ${input.patientPhone}, ${input.patientEmail}, ${input.procedureId},
      ${input.date}, ${input.time}, ${endTime}, ${'confirmed'}, ${input.source}, ${input.notes ?? ''}
    )
    RETURNING id, patient_name, patient_phone, patient_email, procedure_id, booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time, status, source, notes, created_at::text AS created_at, updated_at::text AS updated_at
  `;

  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'booking_created'}, ${'booking'}, ${id}, ${input.source}, ${JSON.stringify({ date: input.date, time: input.time, procedureId: input.procedureId })}::jsonb)
  `;

  return mapBooking(rows[0]);
}

export async function updateBookingStatusInDatabase(id: string, status: BookingStatus): Promise<Booking> {
  const database = db();
  const rows = await database.sql<BookingRow>`
    UPDATE bookings
    SET status = ${status}, updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND id = ${id}
    RETURNING id, patient_name, patient_phone, patient_email, procedure_id, booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time, status, source, notes, created_at::text AS created_at, updated_at::text AS updated_at
  `;

  if (!rows[0]) throw new Error('Booking not found.');

  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'booking_status_updated'}, ${'booking'}, ${id}, ${'admin'}, ${JSON.stringify({ status })}::jsonb)
  `;

  return mapBooking(rows[0]);
}

export async function deleteBookingFromDatabase(id: string): Promise<void> {
  const database = db();
  await database.sql`DELETE FROM bookings WHERE practice_id = ${PRACTICE_ID} AND id = ${id}`;
  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'booking_deleted'}, ${'booking'}, ${id}, ${'admin'}, ${JSON.stringify({ deleted: true })}::jsonb)
  `;
}
