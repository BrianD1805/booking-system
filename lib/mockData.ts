export type Procedure = {
  id: string;
  name: string;
  durationMinutes: number;
  priceGuide?: string;
};

export type BookingStatus = 'confirmed' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show';
export type BookingSource = 'client' | 'admin' | 'staff';

export type Booking = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  procedureId: string;
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
};

export const APP_VERSION = 'Ver-0.003A';

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
  slotIntervalMinutes: 15,
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
  blockedTimes: fallbackBlockedTimes
};

export function procedureName(id: string, procedures: Procedure[] = fallbackProcedures) {
  return procedures.find((item) => item.id === id)?.name ?? 'Procedure not found';
}

export function procedureDuration(id: string, procedures: Procedure[] = fallbackProcedures) {
  return procedures.find((item) => item.id === id)?.durationMinutes ?? 30;
}
