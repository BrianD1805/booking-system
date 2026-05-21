export type Procedure = {
  id: string;
  name: string;
  durationMinutes: number;
  priceGuide?: string;
};

export type Practitioner = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  displayOrder: number;
};

export type PractitionerWorkingHour = {
  practitionerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type PractitionerProcedure = {
  practitionerId: string;
  procedureId: string;
};

export type PractitionerBlockedTime = {
  id: string;
  practitionerId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export type BookingStatus = 'confirmed' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show';
export type BookingSource = 'client' | 'admin' | 'staff';

export type Booking = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  procedureId: string;
  practitionerId: string;
  date: string;
  time: string;
  endTime: string;
  status: BookingStatus;
  source: BookingSource;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type BlockedTime = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export type BlockedDate = {
  date: string;
  reason: string;
};

export type PracticeSettings = {
  practiceId: string;
  practiceName: string;
  bookingSubdomain: string;
  reminderOptions: string[];
  workingDays: number[];
  workingStartTime: string;
  workingEndTime: string;
  slotIntervalMinutes: number;
  minimumNoticeHours: number;
  maxBookingAheadDays: number;
  fallbackSms: boolean;
  mobilePush: boolean;
  medicalDataMode: string;
};

export type BootstrapData = {
  practiceSettings: PracticeSettings;
  procedures: Procedure[];
  blockedDates: BlockedDate[];
  blockedTimes: BlockedTime[];
  practitioners: Practitioner[];
  practitionerWorkingHours: PractitionerWorkingHour[];
  practitionerProcedures: PractitionerProcedure[];
  practitionerBlockedTimes: PractitionerBlockedTime[];
};

export const APP_VERSION = 'Ver-0.011';

export const fallbackProcedures: Procedure[] = [
  { id: 'checkup', name: 'Dental check-up', durationMinutes: 30, priceGuide: 'Standard consultation' },
  { id: 'cleaning', name: 'Scale and polish', durationMinutes: 45, priceGuide: 'Hygienist appointment' },
  { id: 'filling', name: 'Filling appointment', durationMinutes: 60, priceGuide: 'Time varies by case' },
  { id: 'root-canal', name: 'Root canal consultation', durationMinutes: 75, priceGuide: 'Assessment required' },
  { id: 'emergency', name: 'Emergency dental appointment', durationMinutes: 30, priceGuide: 'Priority slot' }
];

export const fallbackBlockedTimes: BlockedTime[] = [
  { id: 'block-lunch', date: '2026-05-18', startTime: '13:00', endTime: '14:00', reason: 'Lunch break' },
  { id: 'block-training', date: '2026-05-19', startTime: '15:00', endTime: '17:00', reason: 'Staff training' }
];


export const fallbackPractitioners: Practitioner[] = [
  { id: 'practitioner_001', name: 'Dr Sarah Demo', role: 'Dentist', active: true, displayOrder: 10 },
  { id: 'practitioner_002', name: 'Dr James Demo', role: 'Dentist', active: true, displayOrder: 20 },
  { id: 'hygienist_001', name: 'Amina Demo', role: 'Hygienist', active: true, displayOrder: 30 }
];

export const fallbackPractitionerWorkingHours: PractitionerWorkingHour[] = [
  { practitionerId: 'practitioner_001', dayOfWeek: 1, startTime: '08:30', endTime: '17:00', active: true },
  { practitionerId: 'practitioner_001', dayOfWeek: 2, startTime: '08:30', endTime: '17:00', active: true },
  { practitionerId: 'practitioner_001', dayOfWeek: 3, startTime: '08:30', endTime: '17:00', active: true },
  { practitionerId: 'practitioner_001', dayOfWeek: 4, startTime: '08:30', endTime: '17:00', active: true },
  { practitionerId: 'practitioner_001', dayOfWeek: 5, startTime: '08:30', endTime: '15:00', active: true },
  { practitionerId: 'practitioner_002', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', active: true },
  { practitionerId: 'practitioner_002', dayOfWeek: 3, startTime: '09:00', endTime: '17:00', active: true },
  { practitionerId: 'practitioner_002', dayOfWeek: 5, startTime: '09:00', endTime: '17:00', active: true },
  { practitionerId: 'hygienist_001', dayOfWeek: 2, startTime: '08:30', endTime: '16:00', active: true },
  { practitionerId: 'hygienist_001', dayOfWeek: 4, startTime: '08:30', endTime: '16:00', active: true }
];

export const fallbackPractitionerProcedures: PractitionerProcedure[] = [
  { practitionerId: 'practitioner_001', procedureId: 'checkup' },
  { practitionerId: 'practitioner_001', procedureId: 'filling' },
  { practitionerId: 'practitioner_001', procedureId: 'root-canal' },
  { practitionerId: 'practitioner_001', procedureId: 'emergency' },
  { practitionerId: 'practitioner_002', procedureId: 'checkup' },
  { practitionerId: 'practitioner_002', procedureId: 'filling' },
  { practitionerId: 'practitioner_002', procedureId: 'emergency' },
  { practitionerId: 'hygienist_001', procedureId: 'cleaning' }
];

export const fallbackPractitionerBlockedTimes: PractitionerBlockedTime[] = [
  { id: 'pb-dr-james-2026-05-20', practitionerId: 'practitioner_002', date: '2026-05-20', startTime: '09:00', endTime: '11:00', reason: 'Clinical meeting' }
];

export const fallbackBlockedDates: BlockedDate[] = [
  { date: '2026-05-22', reason: 'Practice closed / leave day' }
];

export const fallbackPracticeSettings: PracticeSettings = {
  practiceId: 'practice_001',
  practiceName: 'Zippy Dental Demo',
  bookingSubdomain: 'demo.bookings.zippyweb.uk',
  reminderOptions: ['1 day before', '1 hour before', 'Both'],
  workingDays: [1, 2, 3, 4, 5],
  workingStartTime: '08:30',
  workingEndTime: '17:00',
  slotIntervalMinutes: 30,
  minimumNoticeHours: 2,
  maxBookingAheadDays: 90,
  fallbackSms: true,
  mobilePush: true,
  medicalDataMode: 'Dedicated Netlify Database first, later expandable to a shared SaaS database with strict tenant separation.'
};

export const fallbackBootstrap: BootstrapData = {
  practiceSettings: fallbackPracticeSettings,
  procedures: fallbackProcedures,
  blockedDates: fallbackBlockedDates,
  blockedTimes: fallbackBlockedTimes,
  practitioners: fallbackPractitioners,
  practitionerWorkingHours: fallbackPractitionerWorkingHours,
  practitionerProcedures: fallbackPractitionerProcedures,
  practitionerBlockedTimes: fallbackPractitionerBlockedTimes
};

export function procedureName(id: string, procedures: Procedure[] = fallbackProcedures) {
  return procedures.find((item) => item.id === id)?.name ?? 'Procedure not found';
}

export function procedureDuration(id: string, procedures: Procedure[] = fallbackProcedures) {
  return procedures.find((item) => item.id === id)?.durationMinutes ?? 30;
}


export function practitionerName(id: string, practitioners: Practitioner[] = fallbackPractitioners) {
  return practitioners.find((item) => item.id === id)?.name ?? 'Practitioner not found';
}
