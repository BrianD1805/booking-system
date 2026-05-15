'use client';

import { useCallback, useEffect, useState } from 'react';
import { seedBookings, type Booking } from '@/lib/mockData';

const STORAGE_KEY = 'zippyweb-booking-system-live-bookings-v0.002';

function readBookings(): Booking[] {
  if (typeof window === 'undefined') return seedBookings;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedBookings));
      return seedBookings;
    }
    return JSON.parse(saved) as Booking[];
  } catch {
    return seedBookings;
  }
}

function writeBookings(bookings: Booking[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  window.dispatchEvent(new CustomEvent('zippyweb-bookings-updated'));
}

export function useLiveBookings() {
  const [bookings, setBookingsState] = useState<Booking[]>(seedBookings);

  useEffect(() => {
    setBookingsState(readBookings());

    function handleStorage() {
      setBookingsState(readBookings());
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener('zippyweb-bookings-updated', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('zippyweb-bookings-updated', handleStorage);
    };
  }, []);

  const setBookings = useCallback((updater: Booking[] | ((current: Booking[]) => Booking[])) => {
    setBookingsState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      writeBookings(next);
      return next;
    });
  }, []);

  const resetDemoBookings = useCallback(() => {
    writeBookings(seedBookings);
    setBookingsState(seedBookings);
  }, []);

  return { bookings, setBookings, resetDemoBookings };
}
