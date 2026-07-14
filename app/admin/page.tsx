'use client';

import { DatePickerField } from '@/components/DatePickerField';
import { ZipSelect } from '@/components/ZipSelect';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION, practitionerName, procedureName, type BookingStatus, type Customer } from '@/lib/mockData';
import { FIRST_AVAILABLE, getAvailabilityForDate, getDateOffset, getDayLabel, practitionersForProcedure } from '@/lib/availability';
import { useBookingDatabase } from '@/lib/useBookingDatabase';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type AdminStep = 0 | 1 | 2;
type BookingAction = 'confirmed' | 'arrived' | 'completed' | 'billing' | 'cancelled' | 'delete';

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

function slotHasPassed(selectedDate: string, endTime: string, now: Date) {
  return selectedDate === localToday(now) && timeToMinutes(endTime) <= currentMinutes(now);
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
  const [now, setNow] = useState(() => new Date());
  const { bootstrap, bookings, loading, saving, error, lastRefreshedAt, createBooking, updateBookingStatus, deleteBooking, refresh } = useBookingDatabase(selectedDate);
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
  const bookingFlowSlots = useMemo(
    () => getAvailabilityForDate(bookings, selectedDate, activeProcedureId, context, activePractitionerId),
    [bookings, selectedDate, activeProcedureId, context, activePractitionerId]
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
  const visibleOpenSlots = diarySlots.filter((slot) => slot.available && !slotHasPassed(selectedDate, slot.endTime, now));
  const upcomingBookingCount = dateBookings.filter((booking) => !bookingHasPassed(selectedDate, booking.endTime, now)).length;
  const currentClockLabel = formatTwelveHourClock(now);
  const lastRefreshedLabel = lastRefreshedAt ? new Date(lastRefreshedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Not refreshed yet';
  const canSave = Boolean(selectedTime && activePractitionerId && patientName.trim() && patientPhone.trim() && patientEmail.trim());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

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

  async function handleAdminBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    try {
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
      setAdminBookingOpen(false);
    } catch {
      // Error is surfaced by the hook in the page notice.
    }
  }

  return (
    <main className="shell fresh-shell admin-shell">
      <Header area="admin" />

      <section className="admin-command">
        <div>
          <p className="badge blue-badge">Owner/admin app · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Practice diary.</h1>
          <p className="hero-copy tight-copy">A cleaner receptionist view for live appointments, practitioner diaries and fast patient updates.</p>
        </div>
        <div className="command-actions admin-compact-actions">
          <Link className="button primary admin-compact-button" href="/admin/reception">Add booking</Link>
          <button type="button" onClick={() => void handleDiaryRefresh()} disabled={saving || loading} className={`pill admin-action-button admin-compact-button ${loading ? 'is-loading' : ''}`}><span className="refresh-icon" aria-hidden="true">↻</span>{loading ? 'Refreshing…' : 'Refresh diary'}</button>
        </div>
      </section>

      {error && (
        <div className="notice warning" role="alert">
          {error}
          <div style={{ marginTop: 10 }}><button type="button" onClick={() => void handleDiaryRefresh()} className={`pill admin-action-button ${loading ? 'is-loading' : ''}`}><span className="refresh-icon" aria-hidden="true">↻</span>{loading ? 'Retrying…' : 'Retry database connection'}</button></div>
        </div>
      )}

      <section className="compact-dashboard">
        <article className="mini-card"><strong>{practitioners.filter((item) => item.active).length}</strong><span>Active clinicians</span></article>
        <article className="mini-card"><strong>{upcomingBookingCount}</strong><span>Upcoming bookings</span></article>
        <article className="mini-card"><strong>{loading ? '…' : visibleOpenSlots.length}</strong><span>Open slots remaining</span></article>
      </section>

      <section className="card diary-panel clean-panel">
        <div className="section-heading-row">
          <div>
            <h2 className="section-title compact">Diary</h2>
            <p className="mini-copy">{loading ? 'Loading diary from Netlify Database…' : getDayLabel(selectedDate)}</p>
          </div>
        </div>

        <div className="grid two controls-grid">
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

        <div className="diary-focus-note">
          <strong>Diary view</strong>
          <span>This view shows live bookings for the selected date. Cancelled bookings release their slot; deleted bookings are removed from the diary.</span>
        </div>

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
              const passedSlot = slotHasPassed(selectedDate, slot.endTime, now);
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
              <p className="badge blue-badge">Reception booking · Step {adminStep + 1} of 3</p>
              <h2>{adminStep === 0 ? 'Select slot' : adminStep === 1 ? 'Patient details' : 'Confirm booking'}</h2>
            </div>
            <button className="icon-button mobile-close" type="button" aria-label="Close booking flow" onClick={() => setAdminBookingOpen(false)}>×</button>
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
                <h3>Confirm staff booking</h3>
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
              <button className="button primary" type="submit" disabled={!canSave || saving || Boolean(error)}>{saving ? 'Checking diary…' : 'Save confirmed booking'}</button>
            )}
          </div>
        </div>
      </form>

      <p className="footer-note">Owner/admin installable app by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
