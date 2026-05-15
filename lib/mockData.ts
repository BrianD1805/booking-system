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

export const APP_VERSION = 'Ver-0.002';

export const procedures: Procedure[] = [
  { id: 'checkup', name: 'Dental check-up', durationMinutes: 30, priceGuide: 'Standard consultation' },
  { id: 'cleaning', name: 'Scale and polish', durationMinutes: 45, priceGuide: 'Hygienist appointment' },
  { id: 'filling', name: 'Filling appointment', durationMinutes: 60, priceGuide: 'Time varies by case' },
  { id: 'root-canal', name: 'Root canal consultation', durationMinutes: 75, priceGuide: 'Assessment required' },
  { id: 'emergency', name: 'Emergency dental appointment', durationMinutes: 30, priceGuide: 'Priority slot' }
];

export const blockedTimes: BlockedTime[] = [
  { id: 'block-lunch', date: '2026-05-18', startTime: '13:00', endTime: '14:00', reason: 'Lunch break' },
  { id: 'block-training', date: '2026-05-19', startTime: '15:00', endTime: '17:00', reason: 'Staff training' }
];

export const blockedDates = [
  { date: '2026-05-22', reason: 'Practice closed / leave day' }
];

export const seedBookings: Booking[] = [
  {
    id: 'bk-1001',
    patientName: 'Amina Patel',
    patientPhone: '+254 700 000001',
    patientEmail: 'amina@example.com',
    procedureId: 'checkup',
    date: '2026-05-18',
    time: '09:30',
    endTime: '10:00',
    status: 'confirmed',
    source: 'admin',
    notes: 'Prefers morning appointments.',
    createdAt: '2026-05-15T08:00:00.000Z',
    updatedAt: '2026-05-15T08:00:00.000Z'
  },
  {
    id: 'bk-1002',
    patientName: 'David Mwangi',
    patientPhone: '+254 700 000002',
    patientEmail: 'david@example.com',
    procedureId: 'cleaning',
    date: '2026-05-18',
    time: '11:00',
    endTime: '11:45',
    status: 'confirmed',
    source: 'client',
    notes: 'New patient.',
    createdAt: '2026-05-15T08:10:00.000Z',
    updatedAt: '2026-05-15T08:10:00.000Z'
  }
];

export const practiceSettings = {
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

export function procedureName(id: string) {
  return procedures.find((item) => item.id === id)?.name ?? 'Procedure not found';
}

export function procedureDuration(id: string) {
  return procedures.find((item) => item.id === id)?.durationMinutes ?? 30;
}
