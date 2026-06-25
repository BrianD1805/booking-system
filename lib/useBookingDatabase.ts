'use client';

import { useCallback, useEffect, useState } from 'react';
import { fallbackBootstrap, type Booking, type BookingStatus, type BootstrapData } from '@/lib/mockData';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type BookingInput = {
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  customerId?: string;
  procedureId: string;
  practitionerId: string;
  date: string;
  time: string;
  source: 'client' | 'admin' | 'staff';
  notes?: string;
};

type HookState = {
  bootstrap: BootstrapData;
  bookings: Booking[];
  loading: boolean;
  saving: boolean;
  error: string;
  lastRefreshedAt: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : 'Database request failed.';
    throw new Error(message);
  }
  return payload as T;
}

export function useBookingDatabase(selectedDate?: string) {
  const [state, setState] = useState<HookState>({
    bootstrap: fallbackBootstrap,
    bookings: [],
    loading: true,
    saving: false,
    error: '',
    lastRefreshedAt: ''
  });

  const loadBootstrap = useCallback(async () => {
    const response = await fetch('/api/bootstrap', { cache: 'no-store' });
    const payload = await parseJsonResponse<BootstrapData>(response);
    setState((current) => ({ ...current, bootstrap: payload }));
    return payload;
  }, []);

  const loadBookings = useCallback(async () => {
    const query = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : '';
    const response = await fetch(`/api/bookings${query}`, { cache: 'no-store' });
    const payload = await parseJsonResponse<{ bookings: Booking[] }>(response);
    setState((current) => ({ ...current, bookings: payload.bookings, lastRefreshedAt: new Date().toISOString() }));
    return payload.bookings;
  }, [selectedDate]);

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      await loadBootstrap();
      await loadBookings();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Could not connect to Netlify Database.'
      }));
    } finally {
      setState((current) => ({ ...current, loading: false }));
    }
  }, [loadBootstrap, loadBookings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Ver-0.032 database compute guardrail:
  // No automatic polling. Admin diary/reception/client booking screens load once
  // and then update only after a user action such as Refresh, Save or Delete.
  // This prevents an idle browser tab from waking Netlify Database every few seconds.

  const createBooking = useCallback(async (input: BookingInput) => {
    setState((current) => ({ ...current, saving: true, error: '' }));
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(input.source === 'client' ? {} : makeAdminAuthHeaders()) },
        body: JSON.stringify(input)
      });
      const payload = await parseJsonResponse<{ booking: Booking }>(response);
      await loadBookings();
      if (input.source !== 'client') showAdminToast('Booking saved to the diary.');
      return payload.booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create booking.';
      setState((current) => ({ ...current, error: message }));
      throw error;
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  }, [loadBookings]);

  const updateBookingStatus = useCallback(async (id: string, status: BookingStatus) => {
    setState((current) => ({ ...current, saving: true, error: '' }));
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...makeAdminAuthHeaders() },
        body: JSON.stringify({ status })
      });
      const payload = await parseJsonResponse<{ booking: Booking }>(response);
      await loadBookings();
      const statusLabel = status.replace('_', ' ');
      showAdminToast(`Booking marked ${statusLabel}.`);
      return payload.booking;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update booking.';
      setState((current) => ({ ...current, error: message }));
      showAdminToast(message, 'warning');
      throw error;
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  }, [loadBookings]);

  const deleteBooking = useCallback(async (id: string) => {
    setState((current) => ({ ...current, saving: true, error: '' }));
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(id)}`, { method: 'DELETE', headers: makeAdminAuthHeaders() });
      await parseJsonResponse<{ ok: boolean }>(response);
      await loadBookings();
      showAdminToast('Booking deleted from the diary.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete booking.';
      setState((current) => ({ ...current, error: message }));
      showAdminToast(message, 'warning');
      throw error;
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  }, [loadBookings]);

  return {
    ...state,
    refresh,
    createBooking,
    updateBookingStatus,
    deleteBooking
  };
}
