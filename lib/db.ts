import { createHash, randomBytes, randomInt } from 'crypto';
import { getDatabase } from '@netlify/database';
import { deliverClientOtp } from './otpDelivery';
import { addMinutes } from '@/lib/availability';
import {
  procedureDuration,
  type BlockedDate,
  type BlockedTime,
  type Booking,
  type BookingSource,
  type BookingStatus,
  type BootstrapData,
  type ClientLoginBooking,
  type ClientLoginProfile,
  type Customer,
  type PracticeSettings,
  type Practitioner,
  type PractitionerBlockedTime,
  type PractitionerProcedure,
  type PractitionerWorkingHour,
  type Procedure
} from '@/lib/mockData';

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

type PractitionerRow = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  display_order: number;
};

type PractitionerWorkingHourRow = {
  practitioner_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
};

type PractitionerProcedureRow = {
  practitioner_id: string;
  procedure_id: string;
};

type PractitionerBlockedTimeRow = {
  id: string;
  practitioner_id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string;
};

type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  notes: string | null;
  has_client_login: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

type ClientLoginOtpRow = {
  id: string;
  customer_id: string;
  destination: string;
  channel: 'sms' | 'email';
  otp_code_hash: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
};

type ClientSessionRow = {
  id: string;
  customer_id: string;
  expires_at: string;
};

type ClientBookingRow = {
  id: string;
  procedure_name: string | null;
  practitioner_name: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string | null;
};

type BookingRow = {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  customer_id: string | null;
  procedure_id: string;
  practitioner_id: string;
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

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? value.slice(0, 10);
}

function normaliseTime(value: string) {
  return value.slice(0, 5);
}

function cleanLoginValue(value?: string) {
  return (value ?? '').trim();
}

function normaliseInternationalPhone(value?: string) {
  const cleaned = cleanLoginValue(value).replace(/[\s().-]/g, '');
  return cleaned;
}

function isValidInternationalPhone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

function normaliseEmail(value?: string) {
  return cleanLoginValue(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashSecret(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function makeOtpCode() {
  return String(randomInt(100000, 1000000));
}

function makeToken(prefix: string) {
  return `${prefix}-${randomBytes(24).toString('hex')}`;
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

function mapPractitioner(row: PractitionerRow): Practitioner {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    active: row.active,
    displayOrder: row.display_order
  };
}

function mapPractitionerWorkingHour(row: PractitionerWorkingHourRow): PractitionerWorkingHour {
  return {
    practitionerId: row.practitioner_id,
    dayOfWeek: row.day_of_week,
    startTime: normaliseTime(row.start_time),
    endTime: normaliseTime(row.end_time),
    active: row.active
  };
}

function mapPractitionerProcedure(row: PractitionerProcedureRow): PractitionerProcedure {
  return {
    practitionerId: row.practitioner_id,
    procedureId: row.procedure_id
  };
}

function mapPractitionerBlockedTime(row: PractitionerBlockedTimeRow): PractitionerBlockedTime {
  return {
    id: row.id,
    practitionerId: row.practitioner_id,
    date: normaliseDate(row.blocked_date),
    startTime: normaliseTime(row.start_time),
    endTime: normaliseTime(row.end_time),
    reason: row.reason
  };
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    notes: row.notes ?? '',
    hasClientLogin: row.has_client_login,
    lastSeenAt: row.last_seen_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    patientEmail: row.patient_email,
    customerId: row.customer_id ?? undefined,
    procedureId: row.procedure_id,
    practitionerId: row.practitioner_id,
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
  const [practiceRows, procedureRows, blockedDateRows, blockedTimeRows, practitionerRows, practitionerWorkingHourRows, practitionerProcedureRows, practitionerBlockedTimeRows] = await Promise.all([
    database.sql<PracticeRow>`SELECT * FROM practices WHERE id = ${PRACTICE_ID} LIMIT 1`,
    database.sql<ProcedureRow>`SELECT id, name, duration_minutes, price_guide FROM procedures WHERE practice_id = ${PRACTICE_ID} AND active = TRUE ORDER BY display_order, name`,
    database.sql<BlockedDateRow>`SELECT blocked_date::text AS blocked_date, reason FROM blocked_dates WHERE practice_id = ${PRACTICE_ID} ORDER BY blocked_date`,
    database.sql<BlockedTimeRow>`SELECT id, blocked_date::text AS blocked_date, start_time::text AS start_time, end_time::text AS end_time, reason FROM blocked_times WHERE practice_id = ${PRACTICE_ID} ORDER BY blocked_date, start_time`,
    database.sql<PractitionerRow>`SELECT id, name, role, active, display_order FROM practitioners WHERE practice_id = ${PRACTICE_ID} ORDER BY display_order, name`,
    database.sql<PractitionerWorkingHourRow>`SELECT practitioner_id, day_of_week, start_time::text AS start_time, end_time::text AS end_time, active FROM practitioner_working_hours WHERE active = TRUE ORDER BY practitioner_id, day_of_week`,
    database.sql<PractitionerProcedureRow>`SELECT practitioner_id, procedure_id FROM practitioner_procedures ORDER BY practitioner_id, procedure_id`,
    database.sql<PractitionerBlockedTimeRow>`SELECT id, practitioner_id, blocked_date::text AS blocked_date, start_time::text AS start_time, end_time::text AS end_time, reason FROM practitioner_blocked_times ORDER BY blocked_date, start_time`
  ]);

  if (!practiceRows[0]) throw new Error('Practice settings were not found. Check that the Netlify Database migration has run.');

  return {
    practiceSettings: mapPractice(practiceRows[0]),
    procedures: procedureRows.map(mapProcedure),
    blockedDates: blockedDateRows.map(mapBlockedDate),
    blockedTimes: blockedTimeRows.map(mapBlockedTime),
    practitioners: practitionerRows.map(mapPractitioner),
    practitionerWorkingHours: practitionerWorkingHourRows.map(mapPractitionerWorkingHour),
    practitionerProcedures: practitionerProcedureRows.map(mapPractitionerProcedure),
    practitionerBlockedTimes: practitionerBlockedTimeRows.map(mapPractitionerBlockedTime)
  };
}

export async function getBookings(date?: string): Promise<Booking[]> {
  const database = db();
  const rows = date
    ? await database.sql<BookingRow>`SELECT id, patient_name, patient_phone, patient_email, customer_id, procedure_id, practitioner_id, booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time, status, source, notes, created_at::text AS created_at, updated_at::text AS updated_at FROM bookings WHERE practice_id = ${PRACTICE_ID} AND booking_date = ${date}::date ORDER BY booking_date, start_time`
    : await database.sql<BookingRow>`SELECT id, patient_name, patient_phone, patient_email, customer_id, procedure_id, practitioner_id, booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time, status, source, notes, created_at::text AS created_at, updated_at::text AS updated_at FROM bookings WHERE practice_id = ${PRACTICE_ID} ORDER BY booking_date, start_time`;
  return rows.map(mapBooking);
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const database = db();
  const pattern = `%${trimmed.toLowerCase()}%`;
  const rows = await database.sql<CustomerRow>`
    SELECT id, full_name, phone, email, notes, has_client_login, last_seen_at::text AS last_seen_at, created_at::text AS created_at, updated_at::text AS updated_at
    FROM customers
    WHERE practice_id = ${PRACTICE_ID}
      AND (
        lower(full_name) LIKE ${pattern}
        OR lower(email) LIKE ${pattern}
        OR lower(phone) LIKE ${pattern}
      )
    ORDER BY updated_at DESC, full_name
    LIMIT 10
  `;

  return rows.map(mapCustomer);
}

async function findCustomerById(customerId: string): Promise<Customer | null> {
  const database = db();
  const rows = await database.sql<CustomerRow>`
    SELECT id, full_name, phone, email, notes, has_client_login, last_seen_at::text AS last_seen_at, created_at::text AS created_at, updated_at::text AS updated_at
    FROM customers
    WHERE practice_id = ${PRACTICE_ID} AND id = ${customerId}
    LIMIT 1
  `;
  return rows[0] ? mapCustomer(rows[0]) : null;
}

async function findOrCreateCustomer(input: { customerId?: string; patientName: string; patientPhone: string; patientEmail: string; notes?: string }): Promise<string> {
  const database = db();

  if (input.customerId) {
    const existing = await findCustomerById(input.customerId);
    if (existing) {
      await database.sql`
        UPDATE customers
        SET full_name = ${input.patientName}, phone = ${input.patientPhone}, email = ${input.patientEmail}, last_seen_at = NOW(), updated_at = NOW()
        WHERE practice_id = ${PRACTICE_ID} AND id = ${input.customerId}
      `;
      return input.customerId;
    }
  }

  const matchingRows = await database.sql<CustomerRow>`
    SELECT id, full_name, phone, email, notes, has_client_login, last_seen_at::text AS last_seen_at, created_at::text AS created_at, updated_at::text AS updated_at
    FROM customers
    WHERE practice_id = ${PRACTICE_ID}
      AND (phone = ${input.patientPhone} OR lower(email) = ${input.patientEmail.toLowerCase()})
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (matchingRows[0]) {
    await database.sql`
      UPDATE customers
      SET full_name = ${input.patientName}, phone = ${input.patientPhone}, email = ${input.patientEmail}, last_seen_at = NOW(), updated_at = NOW()
      WHERE practice_id = ${PRACTICE_ID} AND id = ${matchingRows[0].id}
    `;
    return matchingRows[0].id;
  }

  const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await database.sql`
    INSERT INTO customers (id, practice_id, full_name, phone, email, notes, has_client_login, last_seen_at)
    VALUES (${id}, ${PRACTICE_ID}, ${input.patientName}, ${input.patientPhone}, ${input.patientEmail}, ${input.notes ?? ''}, ${false}, NOW())
  `;
  return id;
}

async function ensurePractitionerCanTakeBooking(input: { practitionerId: string; procedureId: string; date: string; time: string; endTime: string }) {
  const database = db();
  const dayOfWeek = new Date(`${input.date}T12:00:00`).getDay();

  const practitionerRows = await database.sql<{ id: string }>`
    SELECT p.id
    FROM practitioners p
    INNER JOIN practitioner_procedures pp ON pp.practitioner_id = p.id AND pp.procedure_id = ${input.procedureId}
    WHERE p.id = ${input.practitionerId} AND p.practice_id = ${PRACTICE_ID} AND p.active = TRUE
    LIMIT 1
  `;
  if (!practitionerRows[0]) throw new Error('The selected practitioner cannot perform this procedure.');

  const workingRows = await database.sql<{ id: string }>`
    SELECT id
    FROM practitioner_working_hours
    WHERE practitioner_id = ${input.practitionerId}
      AND day_of_week = ${dayOfWeek}
      AND active = TRUE
      AND start_time <= ${input.time}::time
      AND end_time >= ${input.endTime}::time
    LIMIT 1
  `;
  if (!workingRows[0]) throw new Error('The selected practitioner is not working at this time.');

  const blockedDateRows = await database.sql<{ id: string }>`
    SELECT id
    FROM blocked_dates
    WHERE practice_id = ${PRACTICE_ID}
      AND blocked_date = ${input.date}::date
    LIMIT 1
  `;
  if (blockedDateRows[0]) throw new Error('The practice is closed on this date. Please choose another day.');

  const bookingConflicts = await database.sql<{ id: string }>`
    SELECT id
    FROM bookings
    WHERE practice_id = ${PRACTICE_ID}
      AND practitioner_id = ${input.practitionerId}
      AND booking_date = ${input.date}::date
      AND status <> 'cancelled'
      AND start_time < ${input.endTime}::time
      AND ${input.time}::time < end_time
    LIMIT 1
  `;
  if (bookingConflicts[0]) throw new Error('That practitioner already has a booking at this time. Please choose another available slot.');

  const practiceBlocks = await database.sql<{ id: string }>`
    SELECT id
    FROM blocked_times
    WHERE practice_id = ${PRACTICE_ID}
      AND blocked_date = ${input.date}::date
      AND start_time < ${input.endTime}::time
      AND ${input.time}::time < end_time
    LIMIT 1
  `;
  if (practiceBlocks[0]) throw new Error('The practice is blocked at this time. Please choose another available slot.');

  const practitionerBlocks = await database.sql<{ id: string }>`
    SELECT id
    FROM practitioner_blocked_times
    WHERE practitioner_id = ${input.practitionerId}
      AND blocked_date = ${input.date}::date
      AND start_time < ${input.endTime}::time
      AND ${input.time}::time < end_time
    LIMIT 1
  `;
  if (practitionerBlocks[0]) throw new Error('The selected practitioner is blocked at this time. Please choose another available slot.');
}


async function findCustomerForClientLogin(input: { phone?: string }): Promise<Customer | null> {
  const phone = normaliseInternationalPhone(input.phone);
  if (!phone) return null;

  const database = db();
  const rows = await database.sql<CustomerRow>`
    SELECT id, full_name, phone, email, notes, has_client_login, last_seen_at::text AS last_seen_at, created_at::text AS created_at, updated_at::text AS updated_at
    FROM customers
    WHERE practice_id = ${PRACTICE_ID}
      AND phone = ${phone}
    ORDER BY last_seen_at DESC NULLS LAST, updated_at DESC
    LIMIT 1
  `;
  return rows[0] ? mapCustomer(rows[0]) : null;
}

async function ensureClientLoginCustomer(input: { phone: string; email: string }): Promise<Customer> {
  const database = db();
  const phone = normaliseInternationalPhone(input.phone);
  const email = normaliseEmail(input.email);
  const existing = await findCustomerForClientLogin({ phone });

  if (existing) {
    const rows = await database.sql<CustomerRow>`
      UPDATE customers
      SET phone = ${phone},
          email = CASE WHEN ${email} <> '' THEN ${email} ELSE email END,
          has_client_login = TRUE,
          last_seen_at = NOW(),
          updated_at = NOW()
      WHERE practice_id = ${PRACTICE_ID} AND id = ${existing.id}
      RETURNING id, full_name, phone, email, notes, has_client_login, last_seen_at::text AS last_seen_at, created_at::text AS created_at, updated_at::text AS updated_at
    `;
    return mapCustomer(rows[0]);
  }

  const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const safeEmail = email || `${id}@client-login.local`;
  const rows = await database.sql<CustomerRow>`
    INSERT INTO customers (id, practice_id, full_name, phone, email, notes, has_client_login, last_seen_at)
    VALUES (${id}, ${PRACTICE_ID}, ${'Client user'}, ${phone}, ${safeEmail}, ${'Created from client phone account identifier.'}, TRUE, NOW())
    RETURNING id, full_name, phone, email, notes, has_client_login, last_seen_at::text AS last_seen_at, created_at::text AS created_at, updated_at::text AS updated_at
  `;
  return mapCustomer(rows[0]);
}

async function ensureClientAccount(customer: Customer, input: { phone: string; email: string }) {
  const database = db();
  const phone = normaliseInternationalPhone(input.phone);
  const email = normaliseEmail(input.email) || customer.email.toLowerCase();
  const existing = await database.sql<{ id: string }>`
    SELECT id
    FROM client_accounts
    WHERE practice_id = ${PRACTICE_ID}
      AND (customer_id = ${customer.id} OR login_phone = ${phone})
    LIMIT 1
  `;

  if (existing[0]) {
    await database.sql`
      UPDATE client_accounts
      SET customer_id = ${customer.id}, login_phone = ${phone}, login_email = ${email}, otp_enabled = TRUE, updated_at = NOW()
      WHERE id = ${existing[0].id}
    `;
    return existing[0].id;
  }

  const id = `acct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await database.sql`
    INSERT INTO client_accounts (id, customer_id, practice_id, login_phone, login_email, otp_enabled)
    VALUES (${id}, ${customer.id}, ${PRACTICE_ID}, ${phone}, ${email}, TRUE)
  `;
  return id;
}

export async function requestClientLoginOtp(input: { phone?: string; email?: string }): Promise<{ otpId: string; channel: 'sms' | 'email'; destination: string; accountPhone: string; expiresAt: string; deliveryMessage: string; deliveryMode: string; deliveryProvider: string; deliveryReady: boolean }> {
  const phone = normaliseInternationalPhone(input.phone);
  const email = normaliseEmail(input.email);
  if (!phone) throw new Error('Enter your mobile number with the full international code, for example +254712345678.');
  if (!isValidInternationalPhone(phone)) throw new Error('Use the full international mobile number format, for example +254712345678.');
  if (!email) throw new Error('Enter your email address so we can send your login code. SMS delivery will be connected next.');
  if (!isValidEmail(email)) throw new Error('Enter a valid email address for your login code.');

  const customer = await ensureClientLoginCustomer({ phone, email });
  await ensureClientAccount(customer, { phone, email });

  const otpId = `otp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = makeOtpCode();
  const channel: 'sms' | 'email' = 'email';
  const destination = email;
  const database = db();

  await database.sql`
    INSERT INTO client_login_otps (id, practice_id, customer_id, destination, channel, otp_code_hash, expires_at)
    VALUES (${otpId}, ${PRACTICE_ID}, ${customer.id}, ${destination}, ${channel}, ${hashSecret(`${otpId}:${code}`)}, NOW() + INTERVAL '10 minutes')
  `;

  const delivery = await deliverClientOtp({ channel, destination, code, otpId });

  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'client_login_otp_requested'}, ${'customer'}, ${customer.id}, ${'client'}, ${JSON.stringify({ channel, destination, accountPhone: phone, deliveryMode: delivery.mode, deliveryProvider: delivery.provider, deliveryReady: delivery.delivered })}::jsonb)
  `;

  const rows = await database.sql<{ expires_at: string }>`SELECT expires_at::text AS expires_at FROM client_login_otps WHERE id = ${otpId} LIMIT 1`;
  return {
    otpId,
    channel,
    destination,
    accountPhone: phone,
    expiresAt: rows[0]?.expires_at ?? '',
    deliveryMessage: delivery.message,
    deliveryMode: delivery.mode,
    deliveryProvider: delivery.provider,
    deliveryReady: delivery.delivered
  };
}

async function getClientBookingsForCustomer(customerId: string): Promise<ClientLoginBooking[]> {
  const database = db();
  const rows = await database.sql<ClientBookingRow>`
    SELECT b.id,
           p.name AS procedure_name,
           pr.name AS practitioner_name,
           b.booking_date::text AS booking_date,
           b.start_time::text AS start_time,
           b.end_time::text AS end_time,
           b.status,
           b.notes
    FROM bookings b
    LEFT JOIN procedures p ON p.id = b.procedure_id
    LEFT JOIN practitioners pr ON pr.id = b.practitioner_id
    WHERE b.practice_id = ${PRACTICE_ID} AND b.customer_id = ${customerId}
    ORDER BY b.booking_date DESC, b.start_time DESC
    LIMIT 20
  `;

  return rows.map((row) => ({
    id: row.id,
    treatment: row.procedure_name ?? 'Appointment',
    practitioner: row.practitioner_name ?? 'Practitioner',
    date: normaliseDate(row.booking_date),
    time: normaliseTime(row.start_time),
    endTime: normaliseTime(row.end_time),
    status: row.status,
    notes: row.notes ?? ''
  }));
}

async function getClientProfile(customerId: string): Promise<ClientLoginProfile> {
  const customer = await findCustomerById(customerId);
  if (!customer) throw new Error('Client account not found.');
  const bookings = await getClientBookingsForCustomer(customer.id);
  return { customer, bookings };
}

export async function verifyClientLoginOtp(input: { otpId: string; code: string }): Promise<{ sessionToken: string; profile: ClientLoginProfile }> {
  const otpId = cleanLoginValue(input.otpId);
  const code = cleanLoginValue(input.code);
  if (!otpId || !code) throw new Error('Enter the login code.');

  const database = db();
  const rows = await database.sql<ClientLoginOtpRow>`
    SELECT id, customer_id, destination, channel, otp_code_hash, expires_at::text AS expires_at, attempts, consumed_at::text AS consumed_at
    FROM client_login_otps
    WHERE practice_id = ${PRACTICE_ID} AND id = ${otpId}
    LIMIT 1
  `;
  const otp = rows[0];
  if (!otp || otp.consumed_at) throw new Error('This login code is no longer valid. Please request a new one.');
  if (new Date(otp.expires_at).getTime() < Date.now()) throw new Error('This login code has expired. Please request a new one.');
  if (otp.attempts >= 5) throw new Error('Too many incorrect attempts. Please request a new login code.');

  if (hashSecret(`${otp.id}:${code}`) !== otp.otp_code_hash) {
    await database.sql`UPDATE client_login_otps SET attempts = attempts + 1 WHERE id = ${otp.id}`;
    throw new Error('That code was not correct. Please check it and try again.');
  }

  await database.sql`UPDATE client_login_otps SET consumed_at = NOW(), attempts = attempts + 1 WHERE id = ${otp.id}`;
  await database.sql`
    UPDATE client_accounts
    SET verified_at = COALESCE(verified_at, NOW()), last_login_at = NOW(), updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${otp.customer_id}
  `;
  await database.sql`UPDATE customers SET has_client_login = TRUE, last_seen_at = NOW(), updated_at = NOW() WHERE practice_id = ${PRACTICE_ID} AND id = ${otp.customer_id}`;

  const sessionToken = makeToken('client');
  const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await database.sql`
    INSERT INTO client_sessions (id, practice_id, customer_id, session_token_hash, expires_at)
    VALUES (${sessionId}, ${PRACTICE_ID}, ${otp.customer_id}, ${hashSecret(sessionToken)}, NOW() + INTERVAL '30 days')
  `;

  const profile = await getClientProfile(otp.customer_id);
  return { sessionToken, profile };
}

export async function getClientProfileBySession(sessionToken: string): Promise<ClientLoginProfile> {
  const token = cleanLoginValue(sessionToken);
  if (!token) throw new Error('Client session token missing.');

  const database = db();
  const rows = await database.sql<ClientSessionRow>`
    SELECT id, customer_id, expires_at::text AS expires_at
    FROM client_sessions
    WHERE practice_id = ${PRACTICE_ID}
      AND session_token_hash = ${hashSecret(token)}
      AND revoked_at IS NULL
    LIMIT 1
  `;
  const session = rows[0];
  if (!session || new Date(session.expires_at).getTime() < Date.now()) throw new Error('Client session expired. Please sign in again.');

  await database.sql`UPDATE client_sessions SET last_seen_at = NOW() WHERE id = ${session.id}`;
  return getClientProfile(session.customer_id);
}

export async function createBookingInDatabase(input: {
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  customerId?: string;
  procedureId: string;
  practitionerId: string;
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

  await ensurePractitionerCanTakeBooking({
    practitionerId: input.practitionerId,
    procedureId: input.procedureId,
    date: input.date,
    time: input.time,
    endTime
  });

  const customerId = await findOrCreateCustomer({
    customerId: input.customerId,
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    patientEmail: input.patientEmail,
    notes: input.notes
  });

  const rows = await database.sql<BookingRow>`
    INSERT INTO bookings (
      id, practice_id, patient_name, patient_phone, patient_email, customer_id, procedure_id, practitioner_id,
      booking_date, start_time, end_time, status, source, notes
    ) VALUES (
      ${id}, ${PRACTICE_ID}, ${input.patientName}, ${input.patientPhone}, ${input.patientEmail}, ${customerId}, ${input.procedureId}, ${input.practitionerId},
      ${input.date}, ${input.time}, ${endTime}, ${'confirmed'}, ${input.source}, ${input.notes ?? ''}
    )
    RETURNING id, patient_name, patient_phone, patient_email, customer_id, procedure_id, practitioner_id, booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time, status, source, notes, created_at::text AS created_at, updated_at::text AS updated_at
  `;

  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'booking_created'}, ${'booking'}, ${id}, ${input.source}, ${JSON.stringify({ date: input.date, time: input.time, procedureId: input.procedureId, practitionerId: input.practitionerId, customerId })}::jsonb)
  `;

  return mapBooking(rows[0]);
}

export async function updateBookingStatusInDatabase(id: string, status: BookingStatus): Promise<Booking> {
  const database = db();
  const rows = await database.sql<BookingRow>`
    UPDATE bookings
    SET status = ${status}, updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND id = ${id}
    RETURNING id, patient_name, patient_phone, patient_email, customer_id, procedure_id, practitioner_id, booking_date::text AS booking_date, start_time::text AS start_time, end_time::text AS end_time, status, source, notes, created_at::text AS created_at, updated_at::text AS updated_at
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
