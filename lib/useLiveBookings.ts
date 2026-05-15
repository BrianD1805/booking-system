'use client';

// Ver-0.003A compatibility wrapper.
// Older Ver-0.002 builds used browser localStorage through this hook.
// The live diary now uses Netlify Database through useBookingDatabase.
// This file is intentionally kept so stale imports cannot break TypeScript builds
// when Windows overwrites files without deleting old ones.

import { useBookingDatabase } from '@/lib/useBookingDatabase';

export function useLiveBookings(selectedDate?: string) {
  return useBookingDatabase(selectedDate);
}
