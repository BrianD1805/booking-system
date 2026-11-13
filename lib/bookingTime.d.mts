export declare const FALLBACK_PRACTICE_TIME_ZONE: string;
export declare function practiceDateTimeKey(now?: Date, timeZone?: string): string;
export declare function getPracticeToday(now?: Date, timeZone?: string): string;
export declare function bookingStartIsPast(date: string, time: string, timeZone?: string, now?: Date): boolean;
export declare function assertFutureBookingStart(date: string, time: string, timeZone?: string, now?: Date): void;

export function assertClientBookingRules(date: string, time: string, settings: { timezone?: string; allowSameDayBookings?: boolean; maxBookingAheadDays?: number; minimumNoticeHours?: number }, now?: Date): void;
