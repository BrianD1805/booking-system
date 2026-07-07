import { createHash, randomBytes, randomInt } from 'crypto';
import { getZipBookDatabase } from './dbProvider';
import { deliverClientOtp, isOtpTestModeEnabled } from './otpDelivery';
import { buildAdminBookingEmailHtml, sendZipBookEmail } from './emailDelivery';
import { getDefaultPracticeId } from './tenant';
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

const PRACTICE_ID = getDefaultPracticeId();

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
  tenant_slug?: string | null;
  public_booking_path?: string | null;
  client_app_url?: string | null;
  admin_app_url?: string | null;
  admin_subdomain?: string | null;
  primary_domain?: string | null;
  custom_domain?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  tenant_status?: string | null;
  subscription_status?: string | null;
  plan_code?: string | null;
  timezone?: string | null;
  locale?: string | null;
  currency_code?: string | null;
  country_code?: string | null;
  onboarding_completed?: boolean | null;
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

type AdminCustomerExtendedRow = CustomerRow & {
  date_of_birth: string | null;
  id_passport_info: string | null;
  address: string | null;
  medical_insurance_name: string | null;
  notification_app_push: boolean | null;
  notification_email: boolean | null;
  notification_sms: boolean | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  allergies_medical_alerts: string | null;
  preferred_language: string | null;
  preferred_contact_time: string | null;
};

type CustomerFamilyMemberRow = {
  id: string;
  customer_id: string;
  full_name: string;
  date_of_birth: string | null;
  relationship: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerDocumentRow = {
  id: string;
  customer_id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  file_data_base64: string | null;
  notes: string | null;
  uploaded_at: string;
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

type ClientAccountRow = {
  id: string;
  customer_id: string;
  login_phone: string;
  login_email: string;
  password_hash: string | null;
  verified_at: string | null;
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
  return getZipBookDatabase();
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

function normaliseDialCode(value?: string) {
  const digits = cleanLoginValue(value).replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

function normaliseInternationalPhone(value?: string) {
  const cleaned = cleanLoginValue(value).replace(/[\s().-]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return `+${cleaned.replace(/\D/g, '')}`;
  return cleaned;
}

function normaliseClientLoginPhone(input: { phone?: string; localPhone?: string; countryDialCode?: string }) {
  const directPhone = normaliseInternationalPhone(input.phone);
  if (directPhone.startsWith('+')) return directPhone;

  const countryDialCode = normaliseDialCode(input.countryDialCode);
  const localSource = cleanLoginValue(input.localPhone) || directPhone;
  if (!countryDialCode || !localSource) return directPhone;

  const countryDigits = countryDialCode.replace(/\D/g, '');
  let digits = localSource.replace(/\D/g, '');
  if (digits.startsWith(countryDigits)) return `+${digits}`;

  digits = digits.replace(/^0+/, '');
  return `${countryDialCode}${digits}`;
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

function validateClientPassword(value?: string) {
  const password = value ?? '';
  if (password.length < 6) throw new Error('Enter a password with at least 6 characters.');
  return password;
}

function hashClientPassword(accountId: string, password: string) {
  return hashSecret(`zipbook-client-password:${accountId}:${password}`);
}

async function createClientSession(customerId: string) {
  const database = db();
  const sessionToken = makeToken('client');
  const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await database.sql`
    INSERT INTO client_sessions (id, practice_id, customer_id, session_token_hash, expires_at)
    VALUES (${sessionId}, ${PRACTICE_ID}, ${customerId}, ${hashSecret(sessionToken)}, NOW() + INTERVAL '30 days')
  `;
  return sessionToken;
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
    medicalDataMode: row.medical_data_mode,
    tenantSlug: row.tenant_slug ?? 'zippy-dental-demo',
    publicBookingPath: row.public_booking_path ?? '/book',
    clientAppUrl: row.client_app_url ?? 'https://zipbook.app/book',
    adminAppUrl: row.admin_app_url ?? 'https://admin.zipbook.app',
    adminSubdomain: row.admin_subdomain ?? 'admin.zipbook.app',
    primaryDomain: row.primary_domain ?? 'zipbook.app',
    customDomain: row.custom_domain ?? undefined,
    tenantStatus: row.tenant_status ?? 'active',
    subscriptionStatus: row.subscription_status ?? 'foundation',
    planCode: row.plan_code ?? 'demo',
    timezone: row.timezone ?? 'Africa/Nairobi',
    locale: row.locale ?? 'en-GB',
    currencyCode: row.currency_code ?? 'KES',
    countryCode: row.country_code ?? 'KE',
    onboardingCompleted: row.onboarding_completed ?? true
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


export type CustomerFamilyMember = {
  id: string;
  customerId: string;
  fullName: string;
  dateOfBirth?: string;
  relationship?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerDocument = {
  id: string;
  customerId: string;
  fileName: string;
  mimeType?: string;
  fileSize: number;
  fileDataBase64?: string;
  notes?: string;
  uploadedAt: string;
};

export type AdminDataCustomer = Customer & {
  loginPhone?: string;
  loginEmail?: string;
  verifiedAt?: string;
  passwordSet: boolean;
  bookingCount: number;
  latestBookingDate?: string;
  dateOfBirth?: string;
  idPassportInfo?: string;
  address?: string;
  medicalInsuranceName?: string;
  notificationAppPush: boolean;
  notificationEmail: boolean;
  notificationSms: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergiesMedicalAlerts?: string;
  preferredLanguage?: string;
  preferredContactTime?: string;
  familyMembers: CustomerFamilyMember[];
  documents: CustomerDocument[];
};

type AdminDataCustomerRow = AdminCustomerExtendedRow & {
  login_phone: string | null;
  login_email: string | null;
  verified_at: string | null;
  password_set: boolean;
  booking_count: number;
  latest_booking_date: string | null;
};

function mapCustomerFamilyMember(row: CustomerFamilyMemberRow): CustomerFamilyMember {
  return {
    id: row.id,
    customerId: row.customer_id,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth ? normaliseDate(row.date_of_birth) : undefined,
    relationship: row.relationship ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCustomerDocument(row: CustomerDocumentRow): CustomerDocument {
  return {
    id: row.id,
    customerId: row.customer_id,
    fileName: row.file_name,
    mimeType: row.mime_type ?? '',
    fileSize: Number(row.file_size ?? 0),
    fileDataBase64: row.file_data_base64 ?? '',
    notes: row.notes ?? '',
    uploadedAt: row.uploaded_at
  };
}

function mapAdminDataCustomer(row: AdminDataCustomerRow, familyMembers: CustomerFamilyMember[] = [], documents: CustomerDocument[] = []): AdminDataCustomer {
  return {
    ...mapCustomer(row),
    loginPhone: row.login_phone ?? undefined,
    loginEmail: row.login_email ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    passwordSet: Boolean(row.password_set),
    bookingCount: Number(row.booking_count ?? 0),
    latestBookingDate: row.latest_booking_date ? normaliseDate(row.latest_booking_date) : undefined,
    dateOfBirth: row.date_of_birth ? normaliseDate(row.date_of_birth) : undefined,
    idPassportInfo: row.id_passport_info ?? '',
    address: row.address ?? '',
    medicalInsuranceName: row.medical_insurance_name ?? '',
    notificationAppPush: row.notification_app_push !== false,
    notificationEmail: row.notification_email !== false,
    notificationSms: row.notification_sms !== false,
    emergencyContactName: row.emergency_contact_name ?? '',
    emergencyContactPhone: row.emergency_contact_phone ?? '',
    allergiesMedicalAlerts: row.allergies_medical_alerts ?? '',
    preferredLanguage: row.preferred_language ?? '',
    preferredContactTime: row.preferred_contact_time ?? '',
    familyMembers,
    documents
  };
}

export async function listAdminDataCustomers(query?: string): Promise<AdminDataCustomer[]> {
  const database = db();
  const trimmed = cleanLoginValue(query).toLowerCase();
  const pattern = `%${trimmed}%`;
  const rows = trimmed.length >= 2
    ? await database.sql<AdminDataCustomerRow>`
      SELECT c.id, c.full_name, c.phone, c.email, c.notes, c.has_client_login, c.last_seen_at::text AS last_seen_at, c.created_at::text AS created_at, c.updated_at::text AS updated_at,
             c.date_of_birth::text AS date_of_birth, c.id_passport_info, c.address, c.medical_insurance_name,
             c.notification_app_push, c.notification_email, c.notification_sms, c.emergency_contact_name, c.emergency_contact_phone,
             c.allergies_medical_alerts, c.preferred_language, c.preferred_contact_time,
             ca.login_phone, ca.login_email, ca.verified_at::text AS verified_at, (ca.password_hash IS NOT NULL AND ca.password_hash <> '') AS password_set,
             COUNT(DISTINCT b.id)::int AS booking_count, MAX(b.booking_date)::text AS latest_booking_date
      FROM customers c
      LEFT JOIN LATERAL (
        SELECT login_phone, login_email, verified_at, password_hash, updated_at, created_at
        FROM client_accounts
        WHERE practice_id = c.practice_id AND customer_id = c.id
        ORDER BY (password_hash IS NOT NULL AND password_hash <> '') DESC, updated_at DESC, created_at DESC
        LIMIT 1
      ) ca ON TRUE
      LEFT JOIN bookings b ON b.customer_id = c.id
      WHERE c.practice_id = ${PRACTICE_ID}
        AND (lower(c.full_name) LIKE ${pattern} OR lower(c.phone) LIKE ${pattern} OR lower(c.email) LIKE ${pattern} OR lower(ca.login_phone) LIKE ${pattern} OR lower(ca.login_email) LIKE ${pattern} OR EXISTS (SELECT 1 FROM customer_family_members fm WHERE fm.practice_id = c.practice_id AND fm.customer_id = c.id AND lower(fm.full_name) LIKE ${pattern}))
      GROUP BY c.id, c.full_name, c.phone, c.email, c.notes, c.has_client_login, c.last_seen_at, c.created_at, c.updated_at, ca.login_phone, ca.login_email, ca.verified_at, ca.password_hash, c.date_of_birth, c.id_passport_info, c.address, c.medical_insurance_name, c.notification_app_push, c.notification_email, c.notification_sms, c.emergency_contact_name, c.emergency_contact_phone, c.allergies_medical_alerts, c.preferred_language, c.preferred_contact_time
      ORDER BY c.updated_at DESC, c.created_at DESC
      LIMIT 50
    `
    : await database.sql<AdminDataCustomerRow>`
      SELECT c.id, c.full_name, c.phone, c.email, c.notes, c.has_client_login, c.last_seen_at::text AS last_seen_at, c.created_at::text AS created_at, c.updated_at::text AS updated_at,
             c.date_of_birth::text AS date_of_birth, c.id_passport_info, c.address, c.medical_insurance_name,
             c.notification_app_push, c.notification_email, c.notification_sms, c.emergency_contact_name, c.emergency_contact_phone,
             c.allergies_medical_alerts, c.preferred_language, c.preferred_contact_time,
             ca.login_phone, ca.login_email, ca.verified_at::text AS verified_at, (ca.password_hash IS NOT NULL AND ca.password_hash <> '') AS password_set,
             COUNT(DISTINCT b.id)::int AS booking_count, MAX(b.booking_date)::text AS latest_booking_date
      FROM customers c
      LEFT JOIN LATERAL (
        SELECT login_phone, login_email, verified_at, password_hash, updated_at, created_at
        FROM client_accounts
        WHERE practice_id = c.practice_id AND customer_id = c.id
        ORDER BY (password_hash IS NOT NULL AND password_hash <> '') DESC, updated_at DESC, created_at DESC
        LIMIT 1
      ) ca ON TRUE
      LEFT JOIN bookings b ON b.customer_id = c.id
      WHERE c.practice_id = ${PRACTICE_ID}
      GROUP BY c.id, c.full_name, c.phone, c.email, c.notes, c.has_client_login, c.last_seen_at, c.created_at, c.updated_at, ca.login_phone, ca.login_email, ca.verified_at, ca.password_hash, c.date_of_birth, c.id_passport_info, c.address, c.medical_insurance_name, c.notification_app_push, c.notification_email, c.notification_sms, c.emergency_contact_name, c.emergency_contact_phone, c.allergies_medical_alerts, c.preferred_language, c.preferred_contact_time
      ORDER BY c.updated_at DESC, c.created_at DESC
      LIMIT 50
    `;

  return await Promise.all(rows.map(hydrateAdminDataCustomer));
}

export async function getAdminDataCustomerById(customerId: string): Promise<AdminDataCustomer | null> {
  const database = db();
  const rows = await database.sql<AdminDataCustomerRow>`
    SELECT c.id, c.full_name, c.phone, c.email, c.notes, c.has_client_login, c.last_seen_at::text AS last_seen_at, c.created_at::text AS created_at, c.updated_at::text AS updated_at,
           c.date_of_birth::text AS date_of_birth, c.id_passport_info, c.address, c.medical_insurance_name,
           c.notification_app_push, c.notification_email, c.notification_sms, c.emergency_contact_name, c.emergency_contact_phone,
           c.allergies_medical_alerts, c.preferred_language, c.preferred_contact_time,
           ca.login_phone, ca.login_email, ca.verified_at::text AS verified_at, (ca.password_hash IS NOT NULL AND ca.password_hash <> '') AS password_set,
           COUNT(DISTINCT b.id)::int AS booking_count, MAX(b.booking_date)::text AS latest_booking_date
    FROM customers c
    LEFT JOIN LATERAL (
      SELECT login_phone, login_email, verified_at, password_hash, updated_at, created_at
      FROM client_accounts
      WHERE practice_id = c.practice_id AND customer_id = c.id
      ORDER BY (password_hash IS NOT NULL AND password_hash <> '') DESC, updated_at DESC, created_at DESC
      LIMIT 1
    ) ca ON TRUE
    LEFT JOIN bookings b ON b.customer_id = c.id
    WHERE c.practice_id = ${PRACTICE_ID} AND c.id = ${customerId}
    GROUP BY c.id, c.full_name, c.phone, c.email, c.notes, c.has_client_login, c.last_seen_at, c.created_at, c.updated_at, ca.login_phone, ca.login_email, ca.verified_at, ca.password_hash, c.date_of_birth, c.id_passport_info, c.address, c.medical_insurance_name, c.notification_app_push, c.notification_email, c.notification_sms, c.emergency_contact_name, c.emergency_contact_phone, c.allergies_medical_alerts, c.preferred_language, c.preferred_contact_time
    LIMIT 1
  `;

  return rows[0] ? await hydrateAdminDataCustomer(rows[0]) : null;
}


async function getCustomerFamilyMembers(customerId: string): Promise<CustomerFamilyMember[]> {
  const database = db();
  const rows = await database.sql<CustomerFamilyMemberRow>`
    SELECT id, customer_id, full_name, date_of_birth::text AS date_of_birth, relationship, notes, created_at::text AS created_at, updated_at::text AS updated_at
    FROM customer_family_members
    WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${customerId}
    ORDER BY full_name
  `;
  return rows.map(mapCustomerFamilyMember);
}

async function getCustomerDocuments(customerId: string): Promise<CustomerDocument[]> {
  const database = db();
  const rows = await database.sql<CustomerDocumentRow>`
    SELECT id, customer_id, file_name, mime_type, file_size, file_data_base64, notes, uploaded_at::text AS uploaded_at
    FROM customer_documents
    WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${customerId}
    ORDER BY uploaded_at DESC
  `;
  return rows.map(mapCustomerDocument);
}

async function hydrateAdminDataCustomer(row: AdminDataCustomerRow): Promise<AdminDataCustomer> {
  const [familyMembers, documents] = await Promise.all([
    getCustomerFamilyMembers(row.id),
    getCustomerDocuments(row.id)
  ]);
  return mapAdminDataCustomer(row, familyMembers, documents);
}

export type SaveAdminDataCustomerInput = {
  id?: string;
  fullName: string;
  phone: string;
  email: string;
  notes?: string;
  dateOfBirth?: string;
  idPassportInfo?: string;
  address?: string;
  medicalInsuranceName?: string;
  notificationAppPush?: boolean;
  notificationEmail?: boolean;
  notificationSms?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergiesMedicalAlerts?: string;
  preferredLanguage?: string;
  preferredContactTime?: string;
  familyMembers?: Array<{ id?: string; fullName: string; dateOfBirth?: string; relationship?: string; notes?: string }>;
  documents?: Array<{ id?: string; fileName: string; mimeType?: string; fileSize?: number; fileDataBase64?: string; notes?: string }>;
  actor?: AdminActor;
};

function normaliseOptionalDate(value?: string) {
  const trimmed = cleanLoginValue(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function cleanFamilyMembers(value?: SaveAdminDataCustomerInput['familyMembers']) {
  return (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: item.id && item.id.startsWith('fam-') ? item.id : `fam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fullName: cleanLoginValue(item.fullName),
      dateOfBirth: normaliseOptionalDate(item.dateOfBirth),
      relationship: cleanLoginValue(item.relationship),
      notes: String(item.notes ?? '').trim()
    }))
    .filter((item) => item.fullName);
}

function cleanDocuments(value?: SaveAdminDataCustomerInput['documents']) {
  return (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: item.id && item.id.startsWith('doc-') ? item.id : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: cleanLoginValue(item.fileName),
      mimeType: cleanLoginValue(item.mimeType),
      fileSize: Math.max(0, Number(item.fileSize ?? 0)),
      fileDataBase64: String(item.fileDataBase64 ?? ''),
      notes: String(item.notes ?? '').trim()
    }))
    .filter((item) => item.fileName);
}

async function replaceCustomerFamilyMembers(customerId: string, familyMembers: ReturnType<typeof cleanFamilyMembers>) {
  const database = db();
  await database.sql`DELETE FROM customer_family_members WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${customerId}`;
  for (const member of familyMembers) {
    await database.sql`
      INSERT INTO customer_family_members (id, practice_id, customer_id, full_name, date_of_birth, relationship, notes)
      VALUES (${member.id}, ${PRACTICE_ID}, ${customerId}, ${member.fullName}, ${member.dateOfBirth}::date, ${member.relationship}, ${member.notes})
    `;
  }
}

async function replaceCustomerDocuments(customerId: string, documents: ReturnType<typeof cleanDocuments>) {
  const database = db();
  await database.sql`DELETE FROM customer_documents WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${customerId}`;
  for (const document of documents) {
    await database.sql`
      INSERT INTO customer_documents (id, practice_id, customer_id, file_name, mime_type, file_size, file_data_base64, notes)
      VALUES (${document.id}, ${PRACTICE_ID}, ${customerId}, ${document.fileName}, ${document.mimeType}, ${document.fileSize}, ${document.fileDataBase64}, ${document.notes})
    `;
  }
}

export async function createAdminDataCustomer(input: SaveAdminDataCustomerInput): Promise<AdminDataCustomer> {
  const database = db();
  const fullName = cleanLoginValue(input.fullName);
  const phone = cleanLoginValue(input.phone);
  const email = normaliseEmail(input.email);
  if (!fullName) throw new Error('Client name is required.');
  if (!phone) throw new Error('Client phone is required.');
  if (!isValidEmail(email)) throw new Error('Enter a valid client email address.');

  const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await database.sql`
    INSERT INTO customers (
      id, practice_id, full_name, phone, email, notes, has_client_login, date_of_birth, id_passport_info, address,
      medical_insurance_name, notification_app_push, notification_email, notification_sms, emergency_contact_name,
      emergency_contact_phone, allergies_medical_alerts, preferred_language, preferred_contact_time
    )
    VALUES (
      ${id}, ${PRACTICE_ID}, ${fullName}, ${phone}, ${email}, ${input.notes ?? ''}, FALSE, ${normaliseOptionalDate(input.dateOfBirth)}::date,
      ${input.idPassportInfo ?? ''}, ${input.address ?? ''}, ${input.medicalInsuranceName ?? ''}, ${input.notificationAppPush !== false},
      ${input.notificationEmail !== false}, ${input.notificationSms !== false}, ${input.emergencyContactName ?? ''}, ${input.emergencyContactPhone ?? ''},
      ${input.allergiesMedicalAlerts ?? ''}, ${input.preferredLanguage ?? ''}, ${input.preferredContactTime ?? ''}
    )
  `;
  await replaceCustomerFamilyMembers(id, cleanFamilyMembers(input.familyMembers));
  await replaceCustomerDocuments(id, cleanDocuments(input.documents));
  await writeAdminAuditLog({ action: 'customer_created', entityType: 'customer', entityId: id, source: 'admin', details: { fullName, phone, email }, actor: input.actor });
  const customer = await getAdminDataCustomerById(id);
  if (!customer) throw new Error('Client was created but could not be reloaded.');
  return customer;
}

export async function updateAdminDataCustomer(input: SaveAdminDataCustomerInput & { id: string }): Promise<AdminDataCustomer> {
  const database = db();
  const fullName = cleanLoginValue(input.fullName);
  const phone = cleanLoginValue(input.phone);
  const email = normaliseEmail(input.email);
  if (!fullName) throw new Error('Client name is required.');
  if (!phone) throw new Error('Client phone is required.');
  if (!isValidEmail(email)) throw new Error('Enter a valid client email address.');

  const rows = await database.sql<CustomerRow>`
    UPDATE customers
    SET full_name = ${fullName},
        phone = ${phone},
        email = ${email},
        notes = ${input.notes ?? ''},
        date_of_birth = ${normaliseOptionalDate(input.dateOfBirth)}::date,
        id_passport_info = ${input.idPassportInfo ?? ''},
        address = ${input.address ?? ''},
        medical_insurance_name = ${input.medicalInsuranceName ?? ''},
        notification_app_push = ${input.notificationAppPush !== false},
        notification_email = ${input.notificationEmail !== false},
        notification_sms = ${input.notificationSms !== false},
        emergency_contact_name = ${input.emergencyContactName ?? ''},
        emergency_contact_phone = ${input.emergencyContactPhone ?? ''},
        allergies_medical_alerts = ${input.allergiesMedicalAlerts ?? ''},
        preferred_language = ${input.preferredLanguage ?? ''},
        preferred_contact_time = ${input.preferredContactTime ?? ''},
        updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND id = ${input.id}
    RETURNING id, full_name, phone, email, notes, has_client_login, last_seen_at::text AS last_seen_at, created_at::text AS created_at, updated_at::text AS updated_at
  `;
  if (!rows[0]) throw new Error('Client not found.');

  await replaceCustomerFamilyMembers(input.id, cleanFamilyMembers(input.familyMembers));
  await replaceCustomerDocuments(input.id, cleanDocuments(input.documents));

  await database.sql`
    UPDATE client_accounts
    SET login_phone = ${phone}, login_email = ${email}, updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${input.id}
  `;

  await writeAdminAuditLog({ action: 'customer_updated', entityType: 'customer', entityId: input.id, source: 'admin', details: { fullName, phone, email, familyMembers: input.familyMembers?.length ?? 0, documents: input.documents?.length ?? 0 }, actor: input.actor });
  const customer = await getAdminDataCustomerById(input.id);
  if (!customer) throw new Error('Client was saved but could not be reloaded.');
  return customer;
}

export async function setAdminDataCustomerPassword(input: { customerId: string; password: string; actor?: AdminActor }): Promise<AdminDataCustomer> {
  const database = db();
  const password = validateClientPassword(input.password);
  const customer = await findCustomerById(input.customerId);
  if (!customer) throw new Error('Customer not found.');

  const loginPhone = normaliseClientLoginPhone({ phone: customer.phone });
  if (!isValidInternationalPhone(loginPhone)) {
    throw new Error('Before setting a password, save the customer phone as a full international number, for example +254701600529.');
  }

  const loginEmail = normaliseEmail(customer.email);
  if (!isValidEmail(loginEmail)) throw new Error('Before setting a password, save a valid customer email address.');

  const existing = await database.sql<{ id: string; customer_id: string }>`
    SELECT id, customer_id
    FROM client_accounts
    WHERE practice_id = ${PRACTICE_ID}
      AND (customer_id = ${customer.id} OR login_phone = ${loginPhone})
    ORDER BY (customer_id = ${customer.id}) DESC, updated_at DESC, created_at DESC
    LIMIT 1
  `;
  const accountId = existing[0]?.id ?? `acct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = hashClientPassword(accountId, password);

  if (existing[0]) {
    await database.sql`
      UPDATE client_accounts
      SET customer_id = ${customer.id}, login_phone = ${loginPhone}, login_email = ${loginEmail}, password_hash = ${passwordHash}, verified_at = COALESCE(verified_at, NOW()), phone_verified_at = COALESCE(phone_verified_at, verified_at, NOW()), otp_enabled = FALSE, updated_at = NOW()
      WHERE practice_id = ${PRACTICE_ID} AND id = ${accountId}
    `;
  } else {
    await database.sql`
      INSERT INTO client_accounts (id, customer_id, practice_id, login_phone, login_email, password_hash, verified_at, phone_verified_at, otp_enabled)
      VALUES (${accountId}, ${customer.id}, ${PRACTICE_ID}, ${loginPhone}, ${loginEmail}, ${passwordHash}, NOW(), NOW(), FALSE)
    `;
  }

  await database.sql`
    UPDATE customers
    SET phone = ${loginPhone}, email = ${loginEmail}, has_client_login = TRUE, updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND id = ${customer.id}
  `;

  const updatedCustomer = await getAdminDataCustomerById(customer.id);
  if (!updatedCustomer?.passwordSet) throw new Error('Password update did not verify. Please reload the customer and try again.');
  await writeAdminAuditLog({ action: 'customer_password_set', entityType: 'customer', entityId: customer.id, source: 'admin', details: { loginPhone, loginEmail }, actor: input.actor });
  return updatedCustomer;
}

export async function deleteAdminDataCustomerAndBookings(customerId: string, actor?: AdminActor): Promise<{ deletedSessions: number; deletedOtps: number; deletedBookings: number; deletedAccounts: number; deletedCustomers: number }> {
  const database = db();
  const customer = await findCustomerById(customerId);
  if (!customer) throw new Error('Customer not found.');

  const sessions = await database.sql<{ count: number }>`WITH deleted AS (DELETE FROM client_sessions WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${customerId} RETURNING id) SELECT COUNT(*)::int AS count FROM deleted`;
  const otps = await database.sql<{ count: number }>`WITH deleted AS (DELETE FROM client_login_otps WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${customerId} RETURNING id) SELECT COUNT(*)::int AS count FROM deleted`;
  const bookings = await database.sql<{ count: number }>`WITH deleted AS (DELETE FROM bookings WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${customerId} RETURNING id) SELECT COUNT(*)::int AS count FROM deleted`;
  const accounts = await database.sql<{ count: number }>`WITH deleted AS (DELETE FROM client_accounts WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${customerId} RETURNING id) SELECT COUNT(*)::int AS count FROM deleted`;
  const customers = await database.sql<{ count: number }>`WITH deleted AS (DELETE FROM customers WHERE practice_id = ${PRACTICE_ID} AND id = ${customerId} RETURNING id) SELECT COUNT(*)::int AS count FROM deleted`;

  const result = {
    deletedSessions: Number(sessions[0]?.count ?? 0),
    deletedOtps: Number(otps[0]?.count ?? 0),
    deletedBookings: Number(bookings[0]?.count ?? 0),
    deletedAccounts: Number(accounts[0]?.count ?? 0),
    deletedCustomers: Number(customers[0]?.count ?? 0)
  };
  await writeAdminAuditLog({ action: 'customer_deleted', entityType: 'customer', entityId: customerId, source: 'admin', details: { fullName: customer.fullName, ...result }, actor });
  return result;
}


const BOOTSTRAP_CACHE_TTL_MS = 60_000;
let cachedBootstrap: { data: BootstrapData; expiresAt: number } | null = null;

function cloneBootstrapData(data: BootstrapData): BootstrapData {
  return JSON.parse(JSON.stringify(data)) as BootstrapData;
}

export async function getBootstrapData(): Promise<BootstrapData> {
  const now = Date.now();
  if (cachedBootstrap && cachedBootstrap.expiresAt > now) {
    return cloneBootstrapData(cachedBootstrap.data);
  }

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

  const data = {
    practiceSettings: mapPractice(practiceRows[0]),
    procedures: procedureRows.map(mapProcedure),
    blockedDates: blockedDateRows.map(mapBlockedDate),
    blockedTimes: blockedTimeRows.map(mapBlockedTime),
    practitioners: practitionerRows.map(mapPractitioner),
    practitionerWorkingHours: practitionerWorkingHourRows.map(mapPractitionerWorkingHour),
    practitionerProcedures: practitionerProcedureRows.map(mapPractitionerProcedure),
    practitionerBlockedTimes: practitionerBlockedTimeRows.map(mapPractitionerBlockedTime)
  };

  cachedBootstrap = { data: cloneBootstrapData(data), expiresAt: now + BOOTSTRAP_CACHE_TTL_MS };
  return data;
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

async function findOrCreateCustomer(input: { customerId?: string; patientName: string; patientPhone: string; patientEmail: string; notes?: string; actor?: AdminActor }): Promise<string> {
  const database = db();

  if (input.customerId) {
    const existing = await findCustomerById(input.customerId);
    if (existing) {
      await database.sql`
        UPDATE customers
        SET full_name = ${input.patientName}, phone = ${input.patientPhone}, email = ${input.patientEmail}, last_seen_at = NOW(), updated_at = NOW()
        WHERE practice_id = ${PRACTICE_ID} AND id = ${input.customerId}
      `;
      await writeAdminAuditLog({ action: 'customer_updated_from_booking', entityType: 'customer', entityId: input.customerId, source: input.actor?.source ?? 'booking', details: { patientName: input.patientName, patientPhone: input.patientPhone, patientEmail: input.patientEmail }, actor: input.actor });
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
    await writeAdminAuditLog({ action: 'customer_updated_from_booking', entityType: 'customer', entityId: matchingRows[0].id, source: input.actor?.source ?? 'booking', details: { patientName: input.patientName, patientPhone: input.patientPhone, patientEmail: input.patientEmail }, actor: input.actor });
    return matchingRows[0].id;
  }

  const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await database.sql`
    INSERT INTO customers (id, practice_id, full_name, phone, email, notes, has_client_login, last_seen_at)
    VALUES (${id}, ${PRACTICE_ID}, ${input.patientName}, ${input.patientPhone}, ${input.patientEmail}, ${input.notes ?? ''}, ${false}, NOW())
  `;
  await writeAdminAuditLog({ action: 'customer_created', entityType: 'customer', entityId: id, source: input.actor?.source ?? 'booking', details: { patientName: input.patientName, patientPhone: input.patientPhone, patientEmail: input.patientEmail }, actor: input.actor });
  return id;
}


async function getAdminNotificationRecipients(): Promise<string[]> {
  const configured = (process.env.ZIPBOOK_ADMIN_NOTIFICATION_EMAIL || process.env.ZIPBOOK_ADMIN_EMAIL || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;

  try {
    const database = db();
    const rows = await database.sql<{ practice_email: string | null }>`
      SELECT practice_email
      FROM practices
      WHERE id = ${PRACTICE_ID}
      LIMIT 1
    `;
    return rows[0]?.practice_email ? [rows[0].practice_email] : [];
  } catch (error) {
    console.warn('[ZipBook Email] Could not load practice email for admin notification.', error);
    return [];
  }
}

async function sendBookingAdminNotification(input: {
  booking: Booking;
  procedureName: string;
  practitionerName: string;
}): Promise<{ attempted: boolean; delivered: boolean; provider: string; recipientCount: number }> {
  const recipients = await getAdminNotificationRecipients();
  if (recipients.length === 0) {
    return { attempted: false, delivered: false, provider: 'email-not-configured', recipientCount: 0 };
  }

  const result = await sendZipBookEmail({
    to: recipients,
    subject: `New ZipBook booking: ${input.booking.patientName} on ${input.booking.date}`,
    html: buildAdminBookingEmailHtml({
      patientName: input.booking.patientName,
      patientPhone: input.booking.patientPhone,
      patientEmail: input.booking.patientEmail,
      date: input.booking.date,
      time: input.booking.time,
      endTime: input.booking.endTime,
      procedureName: input.procedureName,
      practitionerName: input.practitionerName,
      source: input.booking.source,
      notes: input.booking.notes
    })
  });

  return {
    attempted: result.attempted,
    delivered: result.delivered,
    provider: result.provider,
    recipientCount: recipients.length
  };
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


async function findCustomerForClientLogin(input: { phone?: string; localPhone?: string; countryDialCode?: string }): Promise<Customer | null> {
  const phone = normaliseClientLoginPhone(input);
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

async function ensureClientLoginCustomer(input: { phone: string; localPhone?: string; countryDialCode?: string; email: string }): Promise<Customer> {
  const database = db();
  const phone = normaliseClientLoginPhone(input);
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

async function ensureClientAccount(customer: Customer, input: { phone: string; localPhone?: string; countryDialCode?: string; email: string }) {
  const database = db();
  const phone = normaliseClientLoginPhone(input);
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


async function findClientAccountByPhone(phone: string): Promise<ClientAccountRow | null> {
  const database = db();
  const rows = await database.sql<ClientAccountRow>`
    SELECT id, customer_id, login_phone, login_email, password_hash, verified_at::text AS verified_at
    FROM client_accounts
    WHERE practice_id = ${PRACTICE_ID} AND login_phone = ${phone}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function requestClientSignupOtp(input: { phone?: string; localPhone?: string; countryDialCode?: string; email?: string; password?: string }): Promise<{ otpId: string; channel: 'sms' | 'email'; destination: string; accountPhone: string; expiresAt: string; deliveryMessage: string; deliveryMode: string; deliveryProvider: string; deliveryReady: boolean; testOtpCode?: string }> {
  const phone = normaliseClientLoginPhone(input);
  const email = normaliseEmail(input.email);
  const password = validateClientPassword(input.password);
  if (!phone) throw new Error('Select a country and enter your mobile number.');
  if (!isValidInternationalPhone(phone)) throw new Error('Enter a valid mobile number. ZipBook stores it as a full international number, for example +254712345678.');
  if (!email) throw new Error('Enter your email address so we can send your sign-up code.');
  if (!isValidEmail(email)) throw new Error('Enter a valid email address for your sign-up code.');

  const existingAccount = await findClientAccountByPhone(phone);
  if (existingAccount?.verified_at && existingAccount.password_hash) {
    throw new Error('An account already exists for this mobile number. Please sign in instead.');
  }

  const customer = await ensureClientLoginCustomer({ ...input, phone, email });
  const accountId = await ensureClientAccount(customer, { ...input, phone, email });
  const passwordHash = hashClientPassword(accountId, password);
  const database = db();
  await database.sql`
    UPDATE client_accounts
    SET login_phone = ${phone}, login_email = ${email}, password_hash = ${passwordHash}, otp_enabled = TRUE, updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND id = ${accountId}
  `;

  const otpId = `otp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = makeOtpCode();
  const channel: 'sms' | 'email' = 'email';
  const destination = email;

  await database.sql`
    INSERT INTO client_login_otps (id, practice_id, customer_id, destination, channel, otp_code_hash, expires_at)
    VALUES (${otpId}, ${PRACTICE_ID}, ${customer.id}, ${destination}, ${channel}, ${hashSecret(`${otpId}:${code}`)}, NOW() + INTERVAL '10 minutes')
  `;

  const delivery = await deliverClientOtp({ channel, destination, code, otpId, purpose: 'signup' });

  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'client_signup_otp_requested'}, ${'customer'}, ${customer.id}, ${'client'}, ${JSON.stringify({ channel, destination, accountPhone: phone, deliveryMode: delivery.mode, deliveryProvider: delivery.provider, deliveryReady: delivery.delivered })}::jsonb)
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
    deliveryReady: delivery.delivered,
    ...(isOtpTestModeEnabled() ? { testOtpCode: code } : {})
  };
}

export async function verifyClientSignupOtp(input: { otpId: string; code: string }): Promise<{ sessionToken: string; profile: ClientLoginProfile }> {
  const otpId = cleanLoginValue(input.otpId);
  const code = cleanLoginValue(input.code);
  if (!otpId || !code) throw new Error('Enter the sign-up code.');

  const database = db();
  const rows = await database.sql<ClientLoginOtpRow>`
    SELECT id, customer_id, destination, channel, otp_code_hash, expires_at::text AS expires_at, attempts, consumed_at::text AS consumed_at
    FROM client_login_otps
    WHERE practice_id = ${PRACTICE_ID} AND id = ${otpId}
    LIMIT 1
  `;
  const otp = rows[0];
  if (!otp || otp.consumed_at) throw new Error('This sign-up code is no longer valid. Please request a new one.');
  if (new Date(otp.expires_at).getTime() < Date.now()) throw new Error('This sign-up code has expired. Please request a new one.');
  if (otp.attempts >= 5) throw new Error('Too many incorrect attempts. Please request a new sign-up code.');

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

  const sessionToken = await createClientSession(otp.customer_id);
  const profile = await getClientProfile(otp.customer_id);
  return { sessionToken, profile };
}

export async function loginClientWithPassword(input: { phone?: string; localPhone?: string; countryDialCode?: string; password?: string }): Promise<{ sessionToken: string; profile: ClientLoginProfile }> {
  const phone = normaliseClientLoginPhone(input);
  const password = input.password ?? '';
  if (!phone) throw new Error('Select your country and enter your mobile number.');
  if (!isValidInternationalPhone(phone)) throw new Error('Enter a valid mobile number.');
  if (!password) throw new Error('Enter your password.');

  const account = await findClientAccountByPhone(phone);
  if (!account || !account.password_hash) throw new Error('No account was found for this mobile number. Please sign up first.');
  if (!account.verified_at) throw new Error('This mobile number has not been verified yet. Please complete sign-up first.');
  if (hashClientPassword(account.id, password) !== account.password_hash) throw new Error('The mobile number or password was not recognised.');

  const database = db();
  await database.sql`
    UPDATE client_accounts
    SET last_login_at = NOW(), updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND id = ${account.id}
  `;
  await database.sql`UPDATE customers SET last_seen_at = NOW(), updated_at = NOW() WHERE practice_id = ${PRACTICE_ID} AND id = ${account.customer_id}`;

  const sessionToken = await createClientSession(account.customer_id);
  const profile = await getClientProfile(account.customer_id);
  return { sessionToken, profile };
}


export async function requestClientPasswordResetOtp(input: { phone?: string; localPhone?: string; countryDialCode?: string; email?: string }): Promise<{ otpId: string; channel: 'sms' | 'email'; destination: string; accountPhone: string; expiresAt: string; deliveryMessage: string; deliveryMode: string; deliveryProvider: string; deliveryReady: boolean; testOtpCode?: string }> {
  const phone = normaliseClientLoginPhone(input);
  const email = normaliseEmail(input.email);
  if (!phone) throw new Error('Select your country and enter your mobile number.');
  if (!isValidInternationalPhone(phone)) throw new Error('Enter a valid mobile number.');
  if (!email) throw new Error('Enter the email address saved on your account.');
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.');

  const account = await findClientAccountByPhone(phone);
  if (!account || !account.password_hash) throw new Error('We could not find a verified account for those details. Please check the mobile number and email address.');
  if (!account.verified_at) throw new Error('This mobile number has not been verified yet. Please complete sign-up first.');
  if (normaliseEmail(account.login_email) !== email) throw new Error('We could not match that email address to this mobile number.');

  const otpId = `otp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = makeOtpCode();
  const channel: 'sms' | 'email' = 'email';
  const destination = email;
  const database = db();

  await database.sql`
    INSERT INTO client_login_otps (id, practice_id, customer_id, destination, channel, otp_code_hash, expires_at)
    VALUES (${otpId}, ${PRACTICE_ID}, ${account.customer_id}, ${destination}, ${channel}, ${hashSecret(`${otpId}:${code}`)}, NOW() + INTERVAL '10 minutes')
  `;

  const delivery = await deliverClientOtp({ channel, destination, code, otpId, purpose: 'password-reset' });

  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'client_password_reset_otp_requested'}, ${'customer'}, ${account.customer_id}, ${'client'}, ${JSON.stringify({ channel, destination, accountPhone: phone, deliveryMode: delivery.mode, deliveryProvider: delivery.provider, deliveryReady: delivery.delivered })}::jsonb)
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
    deliveryReady: delivery.delivered,
    ...(isOtpTestModeEnabled() ? { testOtpCode: code } : {})
  };
}

export async function confirmClientPasswordReset(input: { otpId: string; code: string; password?: string }): Promise<{ sessionToken: string; profile: ClientLoginProfile }> {
  const otpId = cleanLoginValue(input.otpId);
  const code = cleanLoginValue(input.code);
  const password = validateClientPassword(input.password);
  if (!otpId || !code) throw new Error('Enter the password reset code.');

  const database = db();
  const rows = await database.sql<ClientLoginOtpRow>`
    SELECT id, customer_id, destination, channel, otp_code_hash, expires_at::text AS expires_at, attempts, consumed_at::text AS consumed_at
    FROM client_login_otps
    WHERE practice_id = ${PRACTICE_ID} AND id = ${otpId}
    LIMIT 1
  `;
  const otp = rows[0];
  if (!otp || otp.consumed_at) throw new Error('This password reset code is no longer valid. Please request a new one.');
  if (new Date(otp.expires_at).getTime() < Date.now()) throw new Error('This password reset code has expired. Please request a new one.');
  if (otp.attempts >= 5) throw new Error('Too many incorrect attempts. Please request a new password reset code.');

  if (hashSecret(`${otp.id}:${code}`) !== otp.otp_code_hash) {
    await database.sql`UPDATE client_login_otps SET attempts = attempts + 1 WHERE id = ${otp.id}`;
    throw new Error('That code was not correct. Please check it and try again.');
  }

  const accountRows = await database.sql<ClientAccountRow>`
    SELECT id, customer_id, login_phone, login_email, password_hash, verified_at::text AS verified_at
    FROM client_accounts
    WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${otp.customer_id}
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  `;
  const account = accountRows[0];
  if (!account) throw new Error('Client account not found for this reset code.');

  await database.sql`UPDATE client_login_otps SET consumed_at = NOW(), attempts = attempts + 1 WHERE id = ${otp.id}`;
  await database.sql`
    UPDATE client_accounts
    SET password_hash = ${hashClientPassword(account.id, password)}, verified_at = COALESCE(verified_at, NOW()), last_login_at = NOW(), updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND id = ${account.id}
  `;
  await database.sql`
    UPDATE client_sessions
    SET revoked_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND customer_id = ${otp.customer_id} AND revoked_at IS NULL
  `;
  await database.sql`UPDATE customers SET has_client_login = TRUE, last_seen_at = NOW(), updated_at = NOW() WHERE practice_id = ${PRACTICE_ID} AND id = ${otp.customer_id}`;
  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'client_password_reset_completed'}, ${'customer'}, ${otp.customer_id}, ${'client'}, ${JSON.stringify({ destination: otp.destination, channel: otp.channel })}::jsonb)
  `;

  const sessionToken = await createClientSession(otp.customer_id);
  const profile = await getClientProfile(otp.customer_id);
  return { sessionToken, profile };
}

export async function requestClientLoginOtp(input: { phone?: string; localPhone?: string; countryDialCode?: string; email?: string }): Promise<{ otpId: string; channel: 'sms' | 'email'; destination: string; accountPhone: string; expiresAt: string; deliveryMessage: string; deliveryMode: string; deliveryProvider: string; deliveryReady: boolean; testOtpCode?: string }> {
  const phone = normaliseClientLoginPhone(input);
  const email = normaliseEmail(input.email);
  if (!phone) throw new Error('Select a country and enter your mobile number.');
  if (!isValidInternationalPhone(phone)) throw new Error('Enter a valid mobile number. ZipBook stores it as a full international number, for example +254712345678.');
  if (!email) throw new Error('Enter your email address so we can send your login code. SMS delivery will be connected next.');
  if (!isValidEmail(email)) throw new Error('Enter a valid email address for your login code.');

  const customer = await ensureClientLoginCustomer({ ...input, phone, email });
  await ensureClientAccount(customer, { ...input, phone, email });

  const otpId = `otp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const code = makeOtpCode();
  const channel: 'sms' | 'email' = 'email';
  const destination = email;
  const database = db();

  await database.sql`
    INSERT INTO client_login_otps (id, practice_id, customer_id, destination, channel, otp_code_hash, expires_at)
    VALUES (${otpId}, ${PRACTICE_ID}, ${customer.id}, ${destination}, ${channel}, ${hashSecret(`${otpId}:${code}`)}, NOW() + INTERVAL '10 minutes')
  `;

  const delivery = await deliverClientOtp({ channel, destination, code, otpId, purpose: 'login' });

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
    deliveryReady: delivery.delivered,
    ...(isOtpTestModeEnabled() ? { testOtpCode: code } : {})
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

  const sessionToken = await createClientSession(otp.customer_id);
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
  actor?: AdminActor;
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
    notes: input.notes,
    actor: input.actor
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
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'booking_created'}, ${'booking'}, ${id}, ${input.source}, ${JSON.stringify({ date: input.date, time: input.time, procedureId: input.procedureId, practitionerId: input.practitionerId, customerId, staffId: input.actor?.staffId, staffName: input.actor?.staffName })}::jsonb)
  `;

  const booking = mapBooking(rows[0]);
  const procedure = bootstrap.procedures.find((item) => item.id === input.procedureId);
  const practitioner = bootstrap.practitioners.find((item) => item.id === input.practitionerId);
  const adminNotification = await sendBookingAdminNotification({
    booking,
    procedureName: procedure?.name ?? input.procedureId,
    practitionerName: practitioner?.name ?? input.practitionerId
  });

  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'booking_admin_notification'}, ${'booking'}, ${id}, ${input.source}, ${JSON.stringify(adminNotification)}::jsonb)
  `;

  return booking;
}

export async function updateBookingStatusInDatabase(id: string, status: BookingStatus, actor?: AdminActor): Promise<Booking> {
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
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'booking_status_updated'}, ${'booking'}, ${id}, ${'admin'}, ${JSON.stringify({ status, staffId: actor?.staffId, staffName: actor?.staffName })}::jsonb)
  `;

  return mapBooking(rows[0]);
}


export async function getPastBookingsDemoCleanupSummary(): Promise<{ pastBookingCount: number; beforeDate: string }> {
  const database = db();
  const rows = await database.sql<{ count: number; before_date: string }>`
    SELECT COUNT(*)::int AS count, CURRENT_DATE::text AS before_date
    FROM bookings
    WHERE practice_id = ${PRACTICE_ID}
      AND booking_date < CURRENT_DATE
  `;

  return {
    pastBookingCount: Number(rows[0]?.count ?? 0),
    beforeDate: normaliseDate(rows[0]?.before_date ?? new Date())
  };
}

export async function deletePastBookingsForDemo(): Promise<{ deletedBookings: number; beforeDate: string }> {
  const database = db();
  const deleted = await database.sql<{ count: number; before_date: string }>`
    WITH removed AS (
      DELETE FROM bookings
      WHERE practice_id = ${PRACTICE_ID}
        AND booking_date < CURRENT_DATE
      RETURNING id
    )
    SELECT COUNT(*)::int AS count, CURRENT_DATE::text AS before_date
    FROM removed
  `;

  const deletedBookings = Number(deleted[0]?.count ?? 0);
  const beforeDate = normaliseDate(deleted[0]?.before_date ?? new Date());

  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'past_bookings_demo_cleanup'}, ${'booking'}, ${'past-bookings'}, ${'admin'}, ${JSON.stringify({ deletedBookings, beforeDate })}::jsonb)
  `;

  return { deletedBookings, beforeDate };
}

export async function deleteBookingFromDatabase(id: string, actor?: AdminActor): Promise<void> {
  const database = db();
  await database.sql`DELETE FROM bookings WHERE practice_id = ${PRACTICE_ID} AND id = ${id}`;
  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, details)
    VALUES (${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}, ${PRACTICE_ID}, ${'booking_deleted'}, ${'booking'}, ${id}, ${'admin'}, ${JSON.stringify({ deleted: true, staffId: actor?.staffId, staffName: actor?.staffName })}::jsonb)
  `;
}

export type AdminStaffMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  source: string;
  staffId?: string;
  staffName?: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type AdminStaffRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminAuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  source: string;
  staff_id: string | null;
  staff_name: string | null;
  details: Record<string, unknown> | string | null;
  created_at: string;
};

export type AdminActor = {
  staffId?: string;
  staffName?: string;
  source?: string;
  requestIp?: string;
  userAgent?: string;
};

function mapAdminStaff(row: AdminStaffRow): AdminStaffMember {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? '',
    role: row.role,
    active: row.active,
    lastLoginAt: row.last_login_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function hashAdminStaffPassword(staffId: string, password: string) {
  return hashSecret(`zipbook-admin-staff-password:${staffId}:${password}`);
}

function validateAdminStaffPassword(value?: string) {
  const password = value ?? '';
  if (password.length < 6) throw new Error('Enter a staff password with at least 6 characters.');
  return password;
}

function mapAdminAuditLog(row: AdminAuditLogRow): AdminAuditLog {
  let details: Record<string, unknown> = {};
  if (row.details && typeof row.details === 'object') details = row.details as Record<string, unknown>;
  if (row.details && typeof row.details === 'string') {
    try { details = JSON.parse(row.details) as Record<string, unknown>; } catch { details = {}; }
  }
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? undefined,
    source: row.source,
    staffId: row.staff_id ?? undefined,
    staffName: row.staff_name ?? undefined,
    details,
    createdAt: row.created_at
  };
}

export async function writeAdminAuditLog(input: {
  action: string;
  entityType: string;
  entityId?: string;
  source?: string;
  details?: Record<string, unknown>;
  actor?: AdminActor;
}) {
  const database = db();
  await database.sql`
    INSERT INTO audit_logs (id, practice_id, action, entity_type, entity_id, source, staff_id, staff_name, request_ip, user_agent, details)
    VALUES (
      ${`audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`},
      ${PRACTICE_ID},
      ${input.action},
      ${input.entityType},
      ${input.entityId ?? null},
      ${input.source ?? input.actor?.source ?? 'admin'},
      ${input.actor?.staffId ?? null},
      ${input.actor?.staffName ?? null},
      ${input.actor?.requestIp ?? null},
      ${input.actor?.userAgent ?? null},
      ${JSON.stringify(input.details ?? {})}::jsonb
    )
  `;
}

export async function countAdminStaffMembers(): Promise<number> {
  const database = db();
  const rows = await database.sql<{ count: number }>`
    SELECT COUNT(*)::int AS count
    FROM admin_staff_members
    WHERE practice_id = ${PRACTICE_ID}
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function listAdminStaffMembers(): Promise<AdminStaffMember[]> {
  const database = db();
  const rows = await database.sql<AdminStaffRow>`
    SELECT id, full_name, email, phone, role, active, last_login_at::text AS last_login_at, created_at::text AS created_at, updated_at::text AS updated_at
    FROM admin_staff_members
    WHERE practice_id = ${PRACTICE_ID}
    ORDER BY active DESC, full_name
  `;
  return rows.map(mapAdminStaff);
}

export async function createAdminStaffMember(input: { fullName: string; email: string; phone?: string; role?: string; password?: string; active?: boolean; actor?: AdminActor }): Promise<AdminStaffMember> {
  const database = db();
  const fullName = cleanLoginValue(input.fullName);
  const email = normaliseEmail(input.email);
  const phone = cleanLoginValue(input.phone);
  const role = cleanLoginValue(input.role) || 'Reception';
  const password = validateAdminStaffPassword(input.password);
  if (!fullName) throw new Error('Staff full name is required.');
  if (!isValidEmail(email)) throw new Error('Enter a valid staff email address.');

  const id = `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rows = await database.sql<AdminStaffRow>`
    INSERT INTO admin_staff_members (id, practice_id, full_name, email, phone, role, active, password_hash)
    VALUES (${id}, ${PRACTICE_ID}, ${fullName}, ${email}, ${phone}, ${role}, ${input.active ?? true}, ${hashAdminStaffPassword(id, password)})
    RETURNING id, full_name, email, phone, role, active, last_login_at::text AS last_login_at, created_at::text AS created_at, updated_at::text AS updated_at
  `;
  await writeAdminAuditLog({ action: 'staff_created', entityType: 'staff', entityId: id, source: 'admin', details: { fullName, email, role, active: input.active ?? true }, actor: input.actor });
  return mapAdminStaff(rows[0]);
}

export async function updateAdminStaffMember(input: { id: string; fullName: string; email: string; phone?: string; role?: string; active?: boolean; password?: string; actor?: AdminActor }): Promise<AdminStaffMember> {
  const database = db();
  const fullName = cleanLoginValue(input.fullName);
  const email = normaliseEmail(input.email);
  const phone = cleanLoginValue(input.phone);
  const role = cleanLoginValue(input.role) || 'Reception';
  if (!fullName) throw new Error('Staff full name is required.');
  if (!isValidEmail(email)) throw new Error('Enter a valid staff email address.');

  if (input.password && input.password.trim()) {
    const password = validateAdminStaffPassword(input.password);
    const rows = await database.sql<AdminStaffRow>`
      UPDATE admin_staff_members
      SET full_name = ${fullName}, email = ${email}, phone = ${phone}, role = ${role}, active = ${input.active ?? true}, password_hash = ${hashAdminStaffPassword(input.id, password)}, updated_at = NOW()
      WHERE practice_id = ${PRACTICE_ID} AND id = ${input.id}
      RETURNING id, full_name, email, phone, role, active, last_login_at::text AS last_login_at, created_at::text AS created_at, updated_at::text AS updated_at
    `;
    if (!rows[0]) throw new Error('Staff member not found.');
    await writeAdminAuditLog({ action: 'staff_updated', entityType: 'staff', entityId: input.id, source: 'admin', details: { fullName, email, role, active: input.active ?? true, passwordChanged: true }, actor: input.actor });
    return mapAdminStaff(rows[0]);
  }

  const rows = await database.sql<AdminStaffRow>`
    UPDATE admin_staff_members
    SET full_name = ${fullName}, email = ${email}, phone = ${phone}, role = ${role}, active = ${input.active ?? true}, updated_at = NOW()
    WHERE practice_id = ${PRACTICE_ID} AND id = ${input.id}
    RETURNING id, full_name, email, phone, role, active, last_login_at::text AS last_login_at, created_at::text AS created_at, updated_at::text AS updated_at
  `;
  if (!rows[0]) throw new Error('Staff member not found.');
  await writeAdminAuditLog({ action: 'staff_updated', entityType: 'staff', entityId: input.id, source: 'admin', details: { fullName, email, role, active: input.active ?? true, passwordChanged: false }, actor: input.actor });
  return mapAdminStaff(rows[0]);
}

export async function deleteAdminStaffMember(input: { id: string; actor?: AdminActor }): Promise<void> {
  const database = db();
  const activeRows = await database.sql<{ count: number }>`
    SELECT COUNT(*)::int AS count FROM admin_staff_members WHERE practice_id = ${PRACTICE_ID} AND active = TRUE AND id <> ${input.id}
  `;
  if (Number(activeRows[0]?.count ?? 0) < 1) throw new Error('You must keep at least one other active staff member before deleting this one.');

  const rows = await database.sql<{ id: string; full_name: string; email: string }>`
    DELETE FROM admin_staff_members
    WHERE practice_id = ${PRACTICE_ID} AND id = ${input.id}
    RETURNING id, full_name, email
  `;
  if (!rows[0]) throw new Error('Staff member not found.');
  await writeAdminAuditLog({ action: 'staff_deleted', entityType: 'staff', entityId: input.id, source: 'admin', details: { fullName: rows[0].full_name, email: rows[0].email }, actor: input.actor });
}

export async function loginAdminStaff(input: { email?: string; password?: string; actor?: AdminActor }): Promise<{ sessionToken: string; staff: AdminStaffMember }> {
  const database = db();
  const email = normaliseEmail(input.email);
  const password = input.password ?? '';
  if (!isValidEmail(email) || !password) throw new Error('Enter staff email and password.');

  const rows = await database.sql<(AdminStaffRow & { password_hash: string })>`
    SELECT id, full_name, email, phone, role, active, password_hash, last_login_at::text AS last_login_at, created_at::text AS created_at, updated_at::text AS updated_at
    FROM admin_staff_members
    WHERE practice_id = ${PRACTICE_ID} AND lower(email) = ${email} AND active = TRUE
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.password_hash !== hashAdminStaffPassword(row.id, password)) throw new Error('Staff login failed. Check the staff email and password.');

  const sessionToken = makeToken('admin-staff');
  const sessionId = `staff-sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await database.sql`
    INSERT INTO admin_staff_sessions (id, practice_id, staff_id, session_token_hash, expires_at)
    VALUES (${sessionId}, ${PRACTICE_ID}, ${row.id}, ${hashSecret(sessionToken)}, NOW() + INTERVAL '12 hours')
  `;
  await database.sql`UPDATE admin_staff_members SET last_login_at = NOW(), updated_at = NOW() WHERE practice_id = ${PRACTICE_ID} AND id = ${row.id}`;
  const staff = mapAdminStaff({ ...row, last_login_at: new Date().toISOString() });
  await writeAdminAuditLog({ action: 'staff_login', entityType: 'staff', entityId: row.id, source: 'admin', details: { email }, actor: { ...input.actor, staffId: row.id, staffName: row.full_name } });
  return { sessionToken, staff };
}

export async function getAdminStaffBySession(sessionToken?: string | null): Promise<AdminStaffMember | null> {
  const token = cleanLoginValue(sessionToken ?? '');
  if (!token) return null;
  const database = db();
  const rows = await database.sql<AdminStaffRow>`
    SELECT s.id, s.full_name, s.email, s.phone, s.role, s.active, s.last_login_at::text AS last_login_at, s.created_at::text AS created_at, s.updated_at::text AS updated_at
    FROM admin_staff_sessions sess
    INNER JOIN admin_staff_members s ON s.id = sess.staff_id AND s.practice_id = sess.practice_id
    WHERE sess.practice_id = ${PRACTICE_ID}
      AND sess.session_token_hash = ${hashSecret(token)}
      AND sess.revoked_at IS NULL
      AND sess.expires_at > NOW()
      AND s.active = TRUE
    LIMIT 1
  `;
  if (!rows[0]) return null;
  await database.sql`UPDATE admin_staff_sessions SET last_seen_at = NOW() WHERE practice_id = ${PRACTICE_ID} AND session_token_hash = ${hashSecret(token)}`;
  return mapAdminStaff(rows[0]);
}

export async function listAdminAuditLogs(limit = 100): Promise<AdminAuditLog[]> {
  const database = db();
  const rows = await database.sql<AdminAuditLogRow>`
    SELECT id, action, entity_type, entity_id, source, staff_id, staff_name, details, created_at::text AS created_at
    FROM audit_logs
    WHERE practice_id = ${PRACTICE_ID}
    ORDER BY created_at DESC
    LIMIT ${Math.max(20, Math.min(250, limit))}
  `;
  return rows.map(mapAdminAuditLog);
}
