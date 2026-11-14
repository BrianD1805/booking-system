import type { Booking, BootstrapData } from './mockData';
export function isValidAvailabilityDate(value: unknown): value is string;
export function publicBookingSlots(rows: { own_id: string | null; practitioner_id: string; booking_date: string; start_time: string; end_time: string }[]): Booking[];
export function publicBootstrap(data: BootstrapData): BootstrapData;
