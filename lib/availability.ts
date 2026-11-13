import { insideHours, crossesLunch, dayOfWeek } from '@/lib/schedulingPolicy.mjs';
import {
  procedureDuration,
  type BlockedDate,
  type BlockedTime,
  type Booking,
  type PracticeSettings,
  type Practitioner,
  type PractitionerBlockedTime,
  type PractitionerProcedure,
  type PractitionerWorkingHour,
  type Procedure
} from '@/lib/mockData';

export type DiarySlot = {
  time: string;
  endTime: string;
  available: boolean;
  reason?: string;
  practitionerId?: string;
  practitionerName?: string;
  availablePractitioners?: Practitioner[];
};

export type AvailabilityContext = {
  practiceSettings: PracticeSettings;
  procedures: Procedure[];
  blockedDates: BlockedDate[];
  blockedTimes: BlockedTime[];
  practitioners: Practitioner[];
  practitionerWorkingHours: PractitionerWorkingHour[];
  practitionerProcedures: PractitionerProcedure[];
  practitionerBlockedTimes: PractitionerBlockedTime[];
};

export const FIRST_AVAILABLE = 'first_available';

export type PractitionerSlotCheck = {
  practitioner: Practitioner;
  available: boolean;
  reason?: string;
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

function parseSafeIsoDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isWorkingDay(date: string, practiceSettings: PracticeSettings) {
  const parsed = parseSafeIsoDate(date);
  if (!parsed) return false;
  const day = parsed.getDay();
  return practiceSettings.workingDays.includes(day);
}

export function getDayLabel(date: string) {
  const parsed = parseSafeIsoDate(date);
  if (!parsed) return 'Select a date';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(parsed);
}

export function getDateOffset(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export function practitionersForProcedure(procedureId: string, context: AvailabilityContext) {
  const allowedIds = new Set(
    context.practitionerProcedures
      .filter((item) => item.procedureId === procedureId)
      .map((item) => item.practitionerId)
  );

  return context.practitioners
    .filter((practitioner) => practitioner.active && allowedIds.has(practitioner.id))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

function workingWindowsForPractitioner(practitionerId: string, date: string, context: AvailabilityContext) {
  const weekday = dayOfWeek(date);
  return context.practitionerWorkingHours.filter(
    (item) => item.practitionerId === practitionerId && item.dayOfWeek === weekday && item.active
  );
}

function explainPractitionerAvailability(practitioner: Practitioner, date: string, slotStart: number, slotEnd: number, bookings: Booking[], context: AvailabilityContext): PractitionerSlotCheck {
  const windows = workingWindowsForPractitioner(practitioner.id, date, context);
  if (!windows.length) {
    return { practitioner, available: false, reason: 'Not working this day' };
  }
  const format = fromMinutes;
  const match = windows.find((item) => insideHours(format(slotStart), format(slotEnd), item.startTime, item.endTime));
  if (!match) {
    return { practitioner, available: false, reason: `Outside working hours (${windows[0].startTime}–${windows[0].endTime})` };
  }
  if (crossesLunch(format(slotStart), format(slotEnd), match.lunchBreakEnabled, match.lunchBreakStart, match.lunchBreakEnd)) {
    return { practitioner, available: false, reason: 'Practitioner lunch break' };
  }

  const bookingConflict = bookings.find((booking) => (
    booking.date === date &&
    booking.practitionerId === practitioner.id &&
    booking.status !== 'cancelled' &&
    rangesOverlap(slotStart, slotEnd, toMinutes(booking.time), toMinutes(booking.endTime))
  ));

  if (bookingConflict) {
    return { practitioner, available: false, reason: `Already booked: ${bookingConflict.patientName}` };
  }

  const practitionerBlock = context.practitionerBlockedTimes.find((block) => (
    block.date === date &&
    block.practitionerId === practitioner.id &&
    rangesOverlap(slotStart, slotEnd, toMinutes(block.startTime), toMinutes(block.endTime))
  ));

  if (practitionerBlock) {
    return { practitioner, available: false, reason: `Practitioner blocked: ${practitionerBlock.reason}` };
  }

  return { practitioner, available: true };
}

function isPractitionerFree(practitioner: Practitioner, date: string, slotStart: number, slotEnd: number, bookings: Booking[], context: AvailabilityContext) {
  return explainPractitionerAvailability(practitioner, date, slotStart, slotEnd, bookings, context).available;
}

function summariseUnavailableChecks(checks: PractitionerSlotCheck[]) {
  const reasons = checks
    .filter((check) => !check.available)
    .slice(0, 2)
    .map((check) => `${check.practitioner.name}: ${check.reason}`);

  if (!reasons.length) return 'No practitioner available';
  return reasons.length < checks.length ? `${reasons.join('; ')}…` : reasons.join('; ');
}

export function getAvailabilityForDate(
  bookings: Booking[],
  date: string,
  procedureId: string,
  context: AvailabilityContext,
  practitionerId: string = FIRST_AVAILABLE
): DiarySlot[] {
  const { practiceSettings, blockedDates, blockedTimes } = context;
  const duration = procedureDuration(procedureId, context.procedures);
  const dayBlocked = blockedDates.find((item) => item.date === date);

  if (!isWorkingDay(date, practiceSettings)) {
    return [{ time: practiceSettings.workingStartTime, endTime: practiceSettings.workingEndTime, available: false, reason: 'Practice is closed on this day' }];
  }

  if (dayBlocked) {
    return [{ time: practiceSettings.workingStartTime, endTime: practiceSettings.workingEndTime, available: false, reason: dayBlocked.reason }];
  }

  const eligiblePractitioners = practitionersForProcedure(procedureId, context)
    .filter((practitioner) => practitionerId === FIRST_AVAILABLE || practitioner.id === practitionerId);

  if (!eligiblePractitioners.length) {
    return [{ time: practiceSettings.workingStartTime, endTime: practiceSettings.workingEndTime, available: false, reason: 'No practitioner can perform this procedure' }];
  }

  const start = toMinutes(practiceSettings.workingStartTime);
  const end = toMinutes(practiceSettings.workingEndTime);
  const slotInterval = practiceSettings.slotIntervalMinutes;
  const practiceBlocks = blockedTimes.filter((block) => block.date === date);
  const slots: DiarySlot[] = [];

  for (let slotStart = start; slotStart < end; slotStart += slotInterval) {
    const slotEnd = slotStart + duration;

    if (slotEnd > end) {
      slots.push({
        time: fromMinutes(slotStart),
        endTime: fromMinutes(end),
        available: false,
        reason: `Not enough time for ${duration} mins before closing`
      });
      continue;
    }

    if (crossesLunch(fromMinutes(slotStart), fromMinutes(slotEnd), practiceSettings.lunchBreakEnabled, practiceSettings.lunchBreakStart, practiceSettings.lunchBreakEnd)) {
      slots.push({ time: fromMinutes(slotStart), endTime: fromMinutes(slotEnd), available: false, reason: 'Practice lunch closure' });
      continue;
    }

    const practiceBlock = practiceBlocks.find((block) => rangesOverlap(slotStart, slotEnd, toMinutes(block.startTime), toMinutes(block.endTime)));

    if (practiceBlock) {
      slots.push({
        time: fromMinutes(slotStart),
        endTime: fromMinutes(slotEnd),
        available: false,
        reason: practiceBlock.reason
      });
      continue;
    }

    const practitionerChecks = eligiblePractitioners.map((practitioner) =>
      explainPractitionerAvailability(practitioner, date, slotStart, slotEnd, bookings, context)
    );
    const availablePractitioners = practitionerChecks.filter((check) => check.available).map((check) => check.practitioner);
    const assignedPractitioner = availablePractitioners[0];

    slots.push({
      time: fromMinutes(slotStart),
      endTime: fromMinutes(slotEnd),
      available: Boolean(assignedPractitioner),
      reason: assignedPractitioner ? undefined : summariseUnavailableChecks(practitionerChecks),
      practitionerId: assignedPractitioner?.id,
      practitionerName: assignedPractitioner?.name,
      availablePractitioners
    });
  }

  return slots;
}
