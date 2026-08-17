'use client';

import { DatePickerField } from '@/components/DatePickerField';
import { ZipSelect } from '@/components/ZipSelect';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION, practitionerName, procedureName, type Booking, type BookingStatus, type Customer } from '@/lib/mockData';
import { FIRST_AVAILABLE, getAvailabilityForDate, getDateOffset, getDayLabel, practitionersForProcedure } from '@/lib/availability';
import { useBookingDatabase } from '@/lib/useBookingDatabase';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type AdminStep = 0 | 1 | 2;
type BookingAction = 'confirmed' | 'arrived' | 'completed' | 'billing' | 'cancelled' | 'edit' | 'delete';

type BookingChangeAlert = {
  id: string;
  action: string;
  bookingId: string;
  patientName: string;
  date: string;
  time: string;
  procedureName: string;
  createdAt: string;
};

type PushPublicKeyResponse = {
  configured: boolean;
  publicKey: string;
};

function adminPhonePushDevice() {
  if (typeof navigator === 'undefined') return false;
  const agent = navigator.userAgent.toLowerCase();
  return agent.includes('iphone') || agent.includes('ipod') || agent.includes('windows phone') || (agent.includes('android') && agent.includes('mobile'));
}

function adminBrowserPushSupported() {
  return adminPhonePushDevice()
    && typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Request failed.');
  return payload as T;
}

async function getAdminCurrentPushSubscription() {
  if (!adminBrowserPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

function bookingOverlapsSlot(booking: { time: string; endTime: string }, slot: { time: string; endTime: string }) {
  const bookingStart = timeToMinutes(booking.time);
  const bookingEnd = timeToMinutes(booking.endTime);
  const slotStart = timeToMinutes(slot.time);
  const slotEnd = timeToMinutes(slot.endTime);
  return bookingStart < slotEnd && slotStart < bookingEnd;
}

function bookingStartsOnSlot(booking: { time: string }, slot: { time: string }) {
  return booking.time === slot.time;
}

function slotStartsInsideSelectedAppointment(slotTime: string, selectedStartTime: string, selectedEndTime?: string) {
  if (!selectedStartTime || !selectedEndTime) return false;
  const slotStart = timeToMinutes(slotTime);
  const selectedStart = timeToMinutes(selectedStartTime);
  const selectedEnd = timeToMinutes(selectedEndTime);
  return slotStart > selectedStart && slotStart < selectedEnd;
}

function localToday(date = new Date()) {
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return local.toISOString().slice(0, 10);
}

function formatTwelveHourClock(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function currentMinutes(date: Date) {
  return (date.getHours() * 60) + date.getMinutes();
}

function slotHasPassed(selectedDate: string, startTime: string, now: Date) {
  return selectedDate === localToday(now) && timeToMinutes(startTime) <= currentMinutes(now);
}

function bookingHasPassed(selectedDate: string, endTime: string, now: Date) {
  return selectedDate === localToday(now) && timeToMinutes(endTime) <= currentMinutes(now);
}

function statusDisplayLabel(status: BookingStatus) {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'arrived') return 'Arrived';
  if (status === 'completed') return 'Completed';
  if (status === 'billing') return 'Billing';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'no_show') return 'No show';
  if (status === 'rescheduled') return 'Rescheduled';
  return status;
}

function bookingActionTitle(action: BookingAction) {
  if (action === 'confirmed') return 'Record that reception has confirmed this booking by SMS, email or call.';
  if (action === 'arrived') return 'Mark patient as arrived and waiting.';
  if (action === 'completed') return 'Mark patient as being treated.';
  if (action === 'billing') return 'Move this booking to billing. Billing link will be added later.';
  if (action === 'cancelled') return 'Cancel this booking and release the diary slot.';
  if (action === 'edit') return 'Edit appointment details, procedure, practitioner, date or time.';
  return 'Delete this booking from the diary.';
}


export default function AdminPage() {
  const [selectedDate, setSelectedDate] = useState(getDateOffset(0));
  const [procedureId, setProcedureId] = useState('checkup');
  const [selectedPractitionerId, setSelectedPractitionerId] = useState('practitioner_001');
  const [diaryPractitionerFilter, setDiaryPractitionerFilter] = useState('all');
  const [selectedTime, setSelectedTime] = useState('');
  const [adminBookingOpen, setAdminBookingOpen] = useState(false);
  const [adminStep, setAdminStep] = useState<AdminStep>(0);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchMessage, setCustomerSearchMessage] = useState('');
  const [lateMessage, setLateMessage] = useState('The dentist is running around 15 minutes late. Thank you for your patience.');
  const [bookingActionKey, setBookingActionKey] = useState('');
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [liveBookingAlert, setLiveBookingAlert] = useState<BookingChangeAlert | null>(null);
  const [adminPushSupported, setAdminPushSupported] = useState(false);
  const [adminPushConfigured, setAdminPushConfigured] = useState(false);
  const [adminPushSubscribed, setAdminPushSubscribed] = useState(false);
  const [adminPushBusy, setAdminPushBusy] = useState(false);
  const [adminPushNotice, setAdminPushNotice] = useState('');
  const liveBookingAlertSinceRef = useRef(new Date().toISOString());
  const [now, setNow] = useState(() => new Date());
  const { bootstrap, bookings, loading, saving, error, lastRefreshedAt, createBooking, updateBookingDetails, updateBookingStatus, deleteBooking, refresh } = useBookingDatabase(selectedDate);
  const { practiceSettings, procedures, blockedDates, blockedTimes, practitioners } = bootstrap;
  const activeProcedureId = procedures.find((procedure) => procedure.id === procedureId)?.id ?? procedures[0]?.id ?? procedureId;
  const context = useMemo(() => ({
    practiceSettings,
    procedures,
    blockedDates,
    blockedTimes,
    practitioners,
    practitionerWorkingHours: bootstrap.practitionerWorkingHours,
    practitionerProcedures: bootstrap.practitionerProcedures,
    practitionerBlockedTimes: bootstrap.practitionerBlockedTimes
  }), [practiceSettings, procedures, blockedDates, blockedTimes, practitioners, bootstrap.practitionerWorkingHours, bootstrap.practitionerProcedures, bootstrap.practitionerBlockedTimes]);
  const eligiblePractitioners = useMemo(() => practitionersForProcedure(activeProcedureId, context), [activeProcedureId, context]);
  const activePractitionerId = eligiblePractitioners.some((item) => item.id === selectedPractitionerId)
    ? selectedPractitionerId
    : eligiblePractitioners[0]?.id ?? selectedPractitionerId;
  const editingBooking = useMemo(() => bookings.find((booking) => booking.id === editingBookingId) ?? null, [bookings, editingBookingId]);
  const availabilityBookings = useMemo(() => editingBookingId ? bookings.filter((booking) => booking.id !== editingBookingId) : bookings, [bookings, editingBookingId]);
  const bookingFlowSlots = useMemo(
    () => getAvailabilityForDate(availabilityBookings, selectedDate, activeProcedureId, context, activePractitionerId),
    [availabilityBookings, selectedDate, activeProcedureId, context, activePractitionerId]
  );
  const diarySlotPreviewProcedureId = procedures.find((procedure) => procedure.id === 'checkup')?.id ?? activeProcedureId;
  const diarySlots = useMemo(
    () => getAvailabilityForDate(
      bookings,
      selectedDate,
      diarySlotPreviewProcedureId,
      context,
      diaryPractitionerFilter === 'all' ? FIRST_AVAILABLE : diaryPractitionerFilter
    ),
    [bookings, selectedDate, diarySlotPreviewProcedureId, context, diaryPractitionerFilter]
  );
  const allDateBookings = bookings
    .filter((booking) => booking.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time) || practitionerName(a.practitionerId, practitioners).localeCompare(practitionerName(b.practitionerId, practitioners)));
  const dateBookings = allDateBookings.filter((booking) =>
    diaryPractitionerFilter === 'all' ? true : booking.practitionerId === diaryPractitionerFilter
  );
  const selectedBookingFlowSlot = bookingFlowSlots.find((slot) => slot.time === selectedTime);
  const visibleOpenSlots = diarySlots.filter((slot) => slot.available && !slotHasPassed(selectedDate, slot.time, now));
  const upcomingBookingCount = dateBookings.filter((booking) => !bookingHasPassed(selectedDate, booking.endTime, now)).length;
  const currentClockLabel = formatTwelveHourClock(now);
  const lastRefreshedLabel = lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Not refreshed yet';
  const canSave = Boolean(selectedTime && activePractitionerId && patientName.trim() && patientPhone.trim() && patientEmail.trim());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminPhonePushReadiness() {
      const supported = adminBrowserPushSupported();
      if (cancelled) return;

      setAdminPushSupported(supported);
      setAdminPushSubscribed(false);
      setAdminPushNotice('');

      if (!supported) {
        setAdminPushConfigured(false);
        return;
      }

      try {
        const keyResponse = await fetch('/api/push/public-key', { cache: 'no-store' });
        const keyStatus = await readJsonResponse<PushPublicKeyResponse>(keyResponse);
        if (cancelled) return;
        setAdminPushConfigured(Boolean(keyStatus.configured && keyStatus.publicKey));

        const subscription = await getAdminCurrentPushSubscription();
        if (cancelled) return;
        setAdminPushSubscribed(Boolean(subscription));

        if (subscription) {
          await fetch('/api/admin-data/push-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...makeAdminAuthHeaders() },
            body: JSON.stringify({ subscription: subscription.toJSON() })
          }).catch(() => undefined);
        }
      } catch {
        if (!cancelled) setAdminPushConfigured(false);
      }
    }

    void checkAdminPhonePushReadiness();
    return () => { cancelled = true; };
  }, []);

  async function activateAdminPhonePush() {
    if (!adminBrowserPushSupported()) {
      setAdminPushSupported(false);
      setAdminPushNotice('Phone push alerts only work on a supported mobile browser/app. Desktop and laptop use the live diary popup.');
      return;
    }

    setAdminPushBusy(true);
    setAdminPushNotice('');

    try {
      const keyResponse = await fetch('/api/push/public-key', { cache: 'no-store' });
      const keyStatus = await readJsonResponse<PushPublicKeyResponse>(keyResponse);
      setAdminPushConfigured(Boolean(keyStatus.configured && keyStatus.publicKey));
      if (!keyStatus.configured || !keyStatus.publicKey) {
        setAdminPushNotice('Push notifications are not configured yet. Check the VAPID keys in Netlify.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setAdminPushNotice('Notifications were not allowed on this phone.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyStatus.publicKey) as BufferSource
      });

      const response = await fetch('/api/admin-data/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...makeAdminAuthHeaders() },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });
      await readJsonResponse<{ ok: boolean }>(response);
      setAdminPushSubscribed(true);
      setAdminPushNotice('Phone alerts are active for client booking changes.');
    } catch (error) {
      setAdminPushNotice(error instanceof Error ? error.message : 'Could not activate phone alerts.');
    } finally {
      setAdminPushBusy(false);
    }
  }

  async function disableAdminPhonePush() {
    setAdminPushBusy(true);
    setAdminPushNotice('');

    try {
      const subscription = await getAdminCurrentPushSubscription();
      const response = await fetch('/api/admin-data/push-subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...makeAdminAuthHeaders() },
        body: JSON.stringify({ endpoint: subscription?.endpoint ?? '' })
      });
      await readJsonResponse<{ ok: boolean }>(response);
      await subscription?.unsubscribe().catch(() => false);
      setAdminPushSubscribed(false);
      setAdminPushNotice('Phone alerts are turned off on this device.');
    } catch (error) {
      setAdminPushNotice(error instanceof Error ? error.message : 'Could not turn off phone alerts.');
    } finally {
      setAdminPushBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function checkClientBookingChanges() {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const since = liveBookingAlertSinceRef.current;
        const response = await fetch(`/api/admin-data/booking-alerts?since=${encodeURIComponent(since)}`, {
          cache: 'no-store',
          headers: makeAdminAuthHeaders()
        });
        if (!response.ok) return;
        const payload = await response.json() as { alerts?: BookingChangeAlert[]; checkedAt?: string };
        const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
        if (alerts.length) {
          const latest = alerts[alerts.length - 1];
          liveBookingAlertSinceRef.current = latest.createdAt || payload.checkedAt || new Date().toISOString();
          if (!cancelled) {
            setLiveBookingAlert(latest);
            showAdminToast(latest.action === 'booking_deleted' ? 'A client deleted a booking.' : 'A client edited a booking.', 'warning');
            await refresh();
          }
        } else if (payload.checkedAt) {
          liveBookingAlertSinceRef.current = payload.checkedAt;
        }
      } catch {
        // Silent by design: the normal Refresh button remains the fallback.
      }
    }

    const timer = window.setInterval(() => { void checkClientBookingChanges(); }, 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [refresh]);

  async function handleDiaryRefresh() {
    await refresh();
    showAdminToast('Diary refreshed.', 'info');
  }

  function bookingActionLabel(action: BookingAction) {
    if (action === 'confirmed') return 'Confirming…';
    if (action === 'arrived') return 'Marking arrived…';
    if (action === 'completed') return 'Moving to treatment…';
    if (action === 'billing') return 'Moving to billing…';
    if (action === 'cancelled') return 'Cancelling…';
    if (action === 'edit') return 'Opening…';
    return 'Deleting…';
  }

  async function handleBookingStatusAction(bookingId: string, status: BookingStatus) {
    const actionKey = `${bookingId}-${status}`;
    setBookingActionKey(actionKey);
    try {
      await updateBookingStatus(bookingId, status);
    } finally {
      setBookingActionKey('');
    }
  }

  async function handleBookingDeleteAction(bookingId: string, patientNameForBooking: string) {
    const confirmed = window.confirm(`Delete booking for ${patientNameForBooking}? This removes it from the diary and records it in the audit trail.`);
    if (!confirmed) return;
    const actionKey = `${bookingId}-delete`;
    setBookingActionKey(actionKey);
    try {
      await deleteBooking(bookingId);
    } finally {
      setBookingActionKey('');
    }
  }

  async function handleCustomerSearch() {
    const query = customerSearch.trim();
    if (query.length < 2) {
      setCustomerSearchMessage('Type at least two characters to search customers.');
      setCustomerResults([]);
      return;
    }

    setCustomerSearching(true);
    setCustomerSearchMessage('');
    try {
      const response = await fetch(`/api/customers?query=${encodeURIComponent(query)}`, { cache: 'no-store', headers: makeAdminAuthHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Customer search failed.');
      const results = Array.isArray(payload.customers) ? payload.customers as Customer[] : [];
      setCustomerResults(results);
      setCustomerSearchMessage(results.length ? '' : 'No matching customer found. Use ad-hoc patient details below.');
    } catch (error) {
      setCustomerSearchMessage(error instanceof Error ? error.message : 'Customer search failed.');
    } finally {
      setCustomerSearching(false);
    }
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setPatientName(customer.fullName);
    setPatientPhone(customer.phone);
    setPatientEmail(customer.email);
    setCustomerSearchMessage(`${customer.fullName} selected for this booking.`);
  }

  function clearCustomerSelection() {
    setSelectedCustomer(null);
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setCustomerSearch('');
    setCustomerResults([]);
    setCustomerSearchMessage('Ad-hoc patient mode selected. This booking will still create or update a customer record, but it will not create a client login account.');
  }

  function resetAdminBookingForm() {
    setEditingBookingId(null);
    setSelectedTime('');
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setNotes('');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerResults([]);
    setCustomerSearchMessage('');
    setAdminStep(0);
  }

  function closeAdminBookingFlow() {
    setAdminBookingOpen(false);
    resetAdminBookingForm();
  }

  function openEditBooking(booking: Booking) {
    setEditingBookingId(booking.id);
    setProcedureId(booking.procedureId);
    setSelectedPractitionerId(booking.practitionerId);
    setSelectedDate(booking.date);
    setSelectedTime(booking.time);
    setPatientName(booking.patientName);
    setPatientPhone(booking.patientPhone);
    setPatientEmail(booking.patientEmail);
    setNotes(booking.notes ?? '');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerResults([]);
    setCustomerSearchMessage('Editing this existing booking. Save changes after checking the diary slot.');
    setAdminStep(0);
    setAdminBookingOpen(true);
  }

  async function handleAdminBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    try {
      if (editingBookingId) {
        await updateBookingDetails({
          id: editingBookingId,
          patientName,
          patientPhone,
          patientEmail,
          customerId: selectedCustomer?.id ?? editingBooking?.customerId,
          procedureId: activeProcedureId,
          practitionerId: activePractitionerId,
          date: selectedDate,
          time: selectedTime,
          source: 'staff',
          notes
        });
      } else {
        await createBooking({
          patientName,
          patientPhone,
          patientEmail,
          customerId: selectedCustomer?.id,
          procedureId: activeProcedureId,
          practitionerId: activePractitionerId,
          date: selectedDate,
          time: selectedTime,
          source: 'staff',
          notes
        });
      }

      setAdminBookingOpen(false);
      resetAdminBookingForm();
    } catch {
      // Error is surfaced by the hook in the page notice.
    }
  }

  return (
    <main className="shell fresh-shell admin-shell">
      <Header area="admin" />

      <section className="admin-command practice-diary-command">
        <div className="practice-diary-title-block">
          <p className="badge blue-badge">Owner/admin app · {APP_VERSION}</p>
          <div className="practice-diary-title-row">
            <h1 className="practice-diary-title">Practice diary</h1>
            <span className="practice-diary-date-inline">{loading ? 'Loading diary…' : getDayLabel(selectedDate)}</span>
          </div>
        </div>

        <div className="command-actions admin-compact-actions practice-diary-actions">
          <Link className="button primary admin-compact-button" href="/admin/reception">Add booking</Link>
          <button type="button" onClick={() => void handleDiaryRefresh()} disabled={saving || loading} className={`pill admin-action-button admin-compact-button ${loading ? 'is-loading' : ''}`}><span className="refresh-icon" aria-hidden="true">↻</span>{loading ? 'Refreshing…' : 'Refresh diary'}</button>
        </div>

        <div className="grid two controls-grid practice-diary-controls">
          <div className="form-row">
            <label htmlFor="adminDate">Date</label>
            <DatePickerField id="adminDate" value={selectedDate} required ariaLabel="Choose diary date" onChange={(nextDate) => { setSelectedDate(nextDate); setSelectedTime(''); }} />
          </div>
          <div className="form-row">
            <label htmlFor="adminPractitionerFilter">Practitioner</label>
            <ZipSelect
              id="adminPractitionerFilter"
              value={diaryPractitionerFilter}
              ariaLabel="Choose practitioner filter"
              onChange={setDiaryPractitionerFilter}
              options={[
                { value: 'all', label: 'All practitioners' },
                ...practitioners.filter((practitioner) => practitioner.active).map((practitioner) => ({
                  value: practitioner.id,
                  label: `${practitioner.name} — ${practitioner.role}`
                }))
              ]}
            />
          </div>
        </div>

        <section className="compact-dashboard practice-diary-stats" aria-label="Diary summary">
          <article className="mini-card"><strong>{practitioners.filter((item) => item.active).length}</strong><span>Active clinicians</span></article>
          <article className="mini-card"><strong>{upcomingBookingCount}</strong><span>Upcoming bookings</span></article>
          <article className="mini-card"><strong>{loading ? '…' : visibleOpenSlots.length}</strong><span>Open slots remaining</span></article>
        </section>
      </section>

      {error && (
        <div className="notice warning" role="alert">
          {error}
          <div style={{ marginTop: 10 }}><button type="button" onClick={() => void handleDiaryRefresh()} className={`pill admin-action-button ${loading ? 'is-loading' : ''}`}><span className="refresh-icon" aria-hidden="true">↻</span>{loading ? 'Retrying…' : 'Retry database connection'}</button></div>
        </div>
      )}

      {liveBookingAlert && (
        <section className="admin-live-alert-popup" role="alertdialog" aria-label="Client booking change alert">
          <div>
            <p className="badge blue-badge">Live diary update</p>
            <h2>{liveBookingAlert.action === 'booking_deleted' ? 'Client deleted a booking.' : 'Client edited a booking.'}</h2>
            <p>{liveBookingAlert.patientName} · {liveBookingAlert.procedureName}{liveBookingAlert.date ? ` · ${getDayLabel(liveBookingAlert.date)}` : ''}{liveBookingAlert.time ? ` at ${liveBookingAlert.time}` : ''}</p>
          </div>
          <div className="admin-live-alert-actions">
            <button className="button primary compact-button" type="button" onClick={() => { setLiveBookingAlert(null); void handleDiaryRefresh(); }}>Refresh diary</button>
            <button className="pill" type="button" onClick={() => setLiveBookingAlert(null)}>Dismiss</button>
          </div>
        </section>
      )}

      <section className="card diary-panel clean-panel live-diary-panel">
        <section className="diary-slots-panel">
          <div className="section-heading-row compact-row">
            <div>
              <h3 className="mini-section-title">Slots view</h3>
              <p className="mini-copy">Visual 30-minute diary preview for the selected date and practitioner filter.</p>
            </div>
            <div className="admin-refresh-cluster"><span className="admin-clock-pill" aria-label="Current time">{currentClockLabel}</span><span className="admin-last-refreshed">Last refreshed {lastRefreshedLabel}</span><button type="button" onClick={() => void handleDiaryRefresh()} disabled={saving || loading} className={`pill admin-action-button ${loading ? 'is-loading' : ''}`}><span className="refresh-icon" aria-hidden="true">↻</span>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
          </div>
          <div className="slot-grid admin-slot-grid">
            {diarySlots.map((slot) => {
              const overlappingBookings = dateBookings.filter((booking) => bookingOverlapsSlot(booking, slot));
              const firstBooking = overlappingBookings[0];
              const startsInThisSlot = firstBooking ? bookingStartsOnSlot(firstBooking, slot) : false;
              const passedSlot = slotHasPassed(selectedDate, slot.time, now);
              const slotStateClass = passedSlot ? 'past' : overlappingBookings.length ? 'booked' : slot.available ? 'available' : 'unavailable';
              return (
                <article key={`${slot.time}-${slot.endTime}-admin-diary`} className={`slot diary-slot-card ${slotStateClass}`}>
                  <strong>{slot.time}–{slot.endTime}</strong>
                  {overlappingBookings.length ? (
                    <>
                      <span>{overlappingBookings.length === 1 ? firstBooking.patientName : `${overlappingBookings.length} bookings`} · {overlappingBookings.length === 1 ? practitionerName(firstBooking.practitionerId, practitioners) : 'multiple clinicians'}</span>
                      <em>{startsInThisSlot ? `Booked until ${firstBooking.endTime}` : `Continues until ${firstBooking.endTime}`}</em>
                      {slot.available && <em>{slot.availablePractitioners?.length ?? 0} other clinician{(slot.availablePractitioners?.length ?? 0) === 1 ? '' : 's'} still free</em>}
                    </>
                  ) : (
                    <>
                      <span>{passedSlot ? 'Time passed' : slot.available ? `${slot.availablePractitioners?.length ?? 1} clinician${(slot.availablePractitioners?.length ?? 1) === 1 ? '' : 's'} free` : 'Greyed out'}</span>
                      <em>{passedSlot ? 'No longer counted as open' : slot.available ? slot.availablePractitioners?.map((item) => item.name).join(', ') : slot.reason ?? 'Unavailable'}</em>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="booking-list visual-list diary-appointment-list">
          {dateBookings.length === 0 && (
            <p className="notice">No bookings are showing for this date and practitioner filter.</p>
          )}
          {dateBookings.map((booking) => {
            const passedBooking = bookingHasPassed(selectedDate, booking.endTime, now);
            return (
            <article className={`booking-item diary-booking-item ${passedBooking ? 'is-past-booking' : ''}`} key={booking.id}>
              <div>
                <strong>{booking.time}–{booking.endTime} · {booking.patientName}</strong>
                <small>{procedureName(booking.procedureId, procedures)}</small>
                <small>{practitionerName(booking.practitionerId, practitioners)}</small>
                <small>Source: {booking.source}. Status: <span className={`status status-${booking.status}`}>{statusDisplayLabel(booking.status)}</span>{passedBooking && <span className="past-booking-note"> · Time passed</span>}</small>
              </div>
              <div className="nav-pills booking-actions">
                <button
                  className="pill admin-action-button status-action-edit"
                  type="button"
                  disabled={saving}
                  title={bookingActionTitle('edit')}
                  onClick={() => openEditBooking(booking)}
                >
                  Edit
                </button>
                {(['confirmed', 'arrived', 'completed', 'billing', 'cancelled'] as BookingStatus[]).map((statusAction) => {
                  const actionKey = `${booking.id}-${statusAction}`;
                  const actionIsBusy = bookingActionKey === actionKey;
                  const alreadySet = booking.status === statusAction;
                  const label = statusDisplayLabel(statusAction);
                  return (
                    <button
                      key={statusAction}
                      className={`pill admin-action-button status-action-${statusAction} ${actionIsBusy ? 'is-loading' : ''} ${alreadySet ? 'is-current-status' : ''}`}
                      type="button"
                      disabled={saving || alreadySet}
                      onClick={() => void handleBookingStatusAction(booking.id, statusAction)}
                      title={alreadySet ? `Already ${label}` : bookingActionTitle(statusAction as BookingAction)}
                    >
                      {actionIsBusy ? bookingActionLabel(statusAction as BookingAction) : label}
                    </button>
                  );
                })}
                <button
                  className={`pill danger admin-action-button ${bookingActionKey === `${booking.id}-delete` ? 'is-loading' : ''}`}
                  type="button"
                  disabled={saving}
                  onClick={() => void handleBookingDeleteAction(booking.id, booking.patientName)}
                >
                  {bookingActionKey === `${booking.id}-delete` ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </article>
            );
          })}
        </section>
      </section>

      <section className="card clean-panel late-panel">
        <h2 className="section-title compact">Running late</h2>
        <p className="mini-copy">Quick message for the selected day’s patients. Push first, SMS fallback later.</p>
        <div className="form-row">
          <label htmlFor="lateMessage">Message</label>
          <textarea id="lateMessage" value={lateMessage} onChange={(event) => setLateMessage(event.target.value)} />
        </div>
        <button className="button primary" type="button">Preview send</button>
      </section>

      <form className={`booking-workflow admin-workflow ${adminBookingOpen ? 'is-open' : ''}`} onSubmit={handleAdminBooking}>
        <div className="workflow-card">
          <div className="workflow-head">
            <div>
              <p className="badge blue-badge">{editingBookingId ? 'Edit booking' : 'Reception booking'} · Step {adminStep + 1} of 3</p>
              <h2>{adminStep === 0 ? 'Select slot' : adminStep === 1 ? 'Patient details' : editingBookingId ? 'Confirm changes' : 'Confirm booking'}</h2>
            </div>
            <button className="icon-button mobile-close" type="button" aria-label="Close booking flow" onClick={closeAdminBookingFlow}>×</button>
          </div>

          {adminStep === 0 && (
            <section className="flow-step">
              <div className="grid three controls-grid">
                <div className="form-row">
                  <label>Date</label>
                  <DatePickerField value={selectedDate} required ariaLabel="Choose booking date" onChange={(nextDate) => { setSelectedDate(nextDate); setSelectedTime(''); }} />
                </div>
                <div className="form-row">
                  <label>Procedure</label>
                  <ZipSelect
                    value={activeProcedureId}
                    ariaLabel="Choose procedure"
                    onChange={(nextValue) => { setProcedureId(nextValue); setSelectedTime(''); }}
                    options={procedures.map((procedure) => ({ value: procedure.id, label: procedure.name }))}
                  />
                </div>
                <div className="form-row">
                  <label>Practitioner</label>
                  <ZipSelect
                    value={activePractitionerId}
                    ariaLabel="Choose practitioner"
                    onChange={(nextValue) => { setSelectedPractitionerId(nextValue); setSelectedTime(''); }}
                    options={eligiblePractitioners.map((practitioner) => ({ value: practitioner.id, label: practitioner.name }))}
                  />
                </div>
              </div>
              <div className="slot-grid popup-slots">
                {bookingFlowSlots.map((slot) => {
                  const isSelectedSlot = selectedTime === slot.time;
                  const isCoveredBySelection = Boolean(
                    selectedBookingFlowSlot &&
                    slotStartsInsideSelectedAppointment(slot.time, selectedBookingFlowSlot.time, selectedBookingFlowSlot.endTime)
                  );
                  return (
                    <button key={`${slot.time}-${slot.endTime}-modal`} className={`slot ${slot.available ? 'available' : 'unavailable'} ${isSelectedSlot ? 'selected' : ''} ${isCoveredBySelection ? 'covered' : ''}`} disabled={!slot.available || saving} type="button" onClick={() => setSelectedTime(slot.time)}>
                      <strong>{slot.time}</strong>
                      <span>{isCoveredBySelection ? 'Included in selected appointment' : slot.available ? slot.endTime : slot.reason ?? 'Unavailable'}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {adminStep === 1 && (
            <section className="flow-step">
              <div className="customer-search-panel">
                <div className="customer-search-head">
                  <div>
                    <h3>Find customer</h3>
                    <p className="mini-copy">Search existing customers first, or book an ad-hoc patient without a client login account.</p>
                  </div>
                  <button className="pill" type="button" onClick={clearCustomerSelection}>Ad-hoc patient</button>
                </div>
                <div className="customer-search-row">
                  <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search name, phone or email" />
                  <button className="button primary" type="button" onClick={handleCustomerSearch} disabled={customerSearching}>
                    {customerSearching ? 'Searching…' : 'Search'}
                  </button>
                </div>
                {selectedCustomer && (
                  <p className="selected-customer-pill">Selected: {selectedCustomer.fullName} · {selectedCustomer.phone}</p>
                )}
                {customerSearchMessage && <p className="mini-copy customer-search-message">{customerSearchMessage}</p>}
                {customerResults.length > 0 && (
                  <div className="customer-result-list">
                    {customerResults.map((customer) => (
                      <button className="customer-result" type="button" key={customer.id} onClick={() => selectCustomer(customer)}>
                        <strong>{customer.fullName}</strong>
                        <span>{customer.phone} · {customer.email}</span>
                        <em>{customer.hasClientLogin ? 'Client login enabled' : 'No client login account'}</em>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid two controls-grid">
                <div className="form-row"><label>Patient name</label><input value={patientName} onChange={(event) => { setPatientName(event.target.value); setSelectedCustomer(null); }} placeholder="Patient full name" required /></div>
                <div className="form-row"><label>Mobile</label><input value={patientPhone} onChange={(event) => { setPatientPhone(event.target.value); setSelectedCustomer(null); }} placeholder="+254..." required /></div>
              </div>
              <div className="form-row"><label>Email</label><input value={patientEmail} onChange={(event) => { setPatientEmail(event.target.value); setSelectedCustomer(null); }} type="email" placeholder="patient@example.com" required /></div>
              <div className="form-row"><label>Notes</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes for the diary." /></div>
            </section>
          )}

          {adminStep === 2 && (
            <section className="flow-step">
              <div className="confirmation-card">
                <h3>{editingBookingId ? 'Confirm booking changes' : 'Confirm staff booking'}</h3>
                <p>{patientName || 'Patient name required'}{selectedCustomer ? ' · existing customer' : ' · ad-hoc/no-login booking'}</p>
                <p>{procedureName(activeProcedureId, procedures)} with {practitionerName(activePractitionerId, practitioners)}</p>
                <p>{getDayLabel(selectedDate)} at {selectedTime || 'choose a time'}</p>
              </div>
            </section>
          )}

          <div className="workflow-actions">
            <button className="pill" type="button" disabled={adminStep === 0 || saving} onClick={() => setAdminStep((current) => Math.max(0, current - 1) as AdminStep)}>Back</button>
            {adminStep < 2 ? (
              <button className="button primary" type="button" disabled={(adminStep === 0 && !selectedTime) || (adminStep === 1 && !patientName.trim())} onClick={() => setAdminStep((current) => Math.min(2, current + 1) as AdminStep)}>Continue</button>
            ) : (
              <button className="button primary" type="submit" disabled={!canSave || saving || Boolean(error)}>{saving ? 'Checking diary…' : editingBookingId ? 'Save booking changes' : 'Save confirmed booking'}</button>
            )}
          </div>
        </div>
      </form>

      <p className="footer-note">Owner/admin installable app by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
