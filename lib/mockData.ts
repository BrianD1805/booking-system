export type Procedure = {
  id: string;
  name: string;
  durationMinutes: number;
  priceGuide?: string;
};

export type Booking = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  procedureId: string;
  date: string;
  time: string;
  status: 'requested' | 'confirmed' | 'rescheduled' | 'cancelled';
  notes?: string;
};

export const procedures: Procedure[] = [
  { id: 'checkup', name: 'Dental check-up', durationMinutes: 30, priceGuide: 'Standard consultation' },
  { id: 'cleaning', name: 'Scale and polish', durationMinutes: 45, priceGuide: 'Hygienist appointment' },
  { id: 'filling', name: 'Filling appointment', durationMinutes: 60, priceGuide: 'Time varies by case' },
  { id: 'root-canal', name: 'Root canal consultation', durationMinutes: 75, priceGuide: 'Assessment required' },
  { id: 'emergency', name: 'Emergency dental appointment', durationMinutes: 30, priceGuide: 'Priority slot' }
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
    status: 'confirmed',
    notes: 'Prefers morning appointments.'
  },
  {
    id: 'bk-1002',
    patientName: 'David Mwangi',
    patientPhone: '+254 700 000002',
    patientEmail: 'david@example.com',
    procedureId: 'cleaning',
    date: '2026-05-18',
    time: '11:00',
    status: 'requested',
    notes: 'New patient.'
  }
];

export const practiceSettings = {
  practiceName: 'Zippy Dental Demo',
  bookingSubdomain: 'demo.bookings.zippyweb.uk',
  reminderOptions: ['1 day before', '1 hour before', 'Both'],
  workingHours: 'Mon–Fri, 08:30–17:00',
  fallbackSms: true,
  mobilePush: true,
  medicalDataMode: 'Dedicated database first, SaaS shared Supabase later with strict tenant separation.'
};

export function procedureName(id: string) {
  return procedures.find((item) => item.id === id)?.name ?? 'Procedure not found';
}
