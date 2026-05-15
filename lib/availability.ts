import { procedureDuration, type BlockedDate, type BlockedTime, type Booking, type PracticeSettings, type Procedure } from '@/lib/mockData';

export type DiarySlot = {
  time: string;
  endTime: string;
  available: boolean;
  reason?: string;
};

export type AvailabilityContext = {
  practiceSettings: PracticeSettings;
  procedures: Procedure[];
  blockedDates: BlockedDate[];
  blockedTimes: BlockedTime[];
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

function fromMinutes(total: number) {
  const hours = Math.floor(total / 60).toString().padStart(2, '0');
  const minutes = (total % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export function addMinutes(time: string, minutesToAdd: number) {
  return fromMinutes(toMinutes(time) + minutesToAdd);
}

export function isWorkingDay(date: string, practiceSettings: PracticeSettings) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return practiceSettings.workingDays.includes(day);
}

export function getDayLabel(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${date}T12:00:00`));
}

export function getDateOffset(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export function getAvailabilityForDate(bookings: Booking[], date: string, procedureId: string, context: AvailabilityContext): DiarySlot[] {
  const { practiceSettings, procedures, blockedDates, blockedTimes } = context;
  const duration = procedureDuration(procedureId, procedures);
  const dayBlocked = blockedDates.find((item) => item.date === date);

  if (!isWorkingDay(date, practiceSettings)) {
    return [{ time: practiceSettings.workingStartTime, endTime: practiceSettings.workingEndTime, available: false, reason: 'Practice is closed on this day' }];
  }

  if (dayBlocked) {
    return [{ time: practiceSettings.workingStartTime, endTime: practiceSettings.workingEndTime, available: false, reason: dayBlocked.reason }];
  }

  const start = toMinutes(practiceSettings.workingStartTime);
  const end = toMinutes(practiceSettings.workingEndTime);
  const slotInterval = practiceSettings.slotIntervalMinutes;
  const liveBookings = bookings.filter((booking) => booking.date === date && booking.status !== 'cancelled');
  const blocks = blockedTimes.filter((block) => block.date === date);
  const slots: DiarySlot[] = [];

  for (let slotStart = start; slotStart + duration <= end; slotStart += slotInterval) {
    const slotEnd = slotStart + duration;
    const bookingConflict = liveBookings.find((booking) => rangesOverlap(slotStart, slotEnd, toMinutes(booking.time), toMinutes(booking.endTime)));
    const blockConflict = blocks.find((block) => rangesOverlap(slotStart, slotEnd, toMinutes(block.startTime), toMinutes(block.endTime)));

    slots.push({
      time: fromMinutes(slotStart),
      endTime: fromMinutes(slotEnd),
      available: !bookingConflict && !blockConflict,
      reason: bookingConflict ? `Booked: ${bookingConflict.patientName}` : blockConflict?.reason
    });
  }

  return slots;
}
