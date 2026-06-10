'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION, practitionerName, procedureDuration, procedureName, type Booking, type Customer } from '@/lib/mockData';
import { FIRST_AVAILABLE, getAvailabilityForDate, getDateOffset, getDayLabel, practitionersForProcedure } from '@/lib/availability';
import { useBookingDatabase } from '@/lib/useBookingDatabase';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type ReceptionMode = 'search' | 'adhoc';

type ReceptionSuccessBooking = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  treatment: string;
  duration: number;
  practitioner: string;
  dateLabel: string;
  time: string;
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

function slotStartsInsideSelectedAppointment(slotTime: string, selectedStartTime: string, selectedEndTime?: string) {
  if (!selectedStartTime || !selectedEndTime) return false;
  const slotStart = timeToMinutes(slotTime);
  const selectedStart = timeToMinutes(selectedStartTime);
  const selectedEnd = timeToMinutes(selectedEndTime);
  return slotStart > selectedStart && slotStart < selectedEnd;
}

export default function ReceptionBookingPage() {
  const [selectedDate, setSelectedDate] = useState(getDateOffset(0));
  const [procedureId, setProcedureId] = useState('checkup');
  const [selectedPractitionerId, setSelectedPractitionerId] = useState(FIRST_AVAILABLE);
  const [selectedTime, setSelectedTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchMessage, setCustomerSearchMessage] = useState('Open client search to find an existing client, or use ad-hoc patient mode.');
  const [receptionMode, setReceptionMode] = useState<ReceptionMode>('search');
  const [saveMessage, setSaveMessage] = useState('');
  const [clientPopupOpen, setClientPopupOpen] = useState(false);
  const [successBooking, setSuccessBooking] = useState<ReceptionSuccessBooking | null>(null);
  const [copyStatus, setCopyStatus] = useState('');

  const { bootstrap, bookings, loading, saving, error, createBooking, refresh } = useBookingDatabase(selectedDate);
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
  const activePractitionerId = selectedPractitionerId === FIRST_AVAILABLE
    ? FIRST_AVAILABLE
    : eligiblePractitioners.some((item) => item.id === selectedPractitionerId)
      ? selectedPractitionerId
      : eligiblePractitioners[0]?.id ?? FIRST_AVAILABLE;

  const receptionSlots = useMemo(
    () => getAvailabilityForDate(bookings, selectedDate, activeProcedureId, context, activePractitionerId),
    [bookings, selectedDate, activeProcedureId, context, activePractitionerId]
  );

  const selectedSlot = receptionSlots.find((slot) => slot.time === selectedTime);
  const selectedSlotPractitionerId = selectedSlot?.practitionerId ?? (activePractitionerId === FIRST_AVAILABLE ? '' : activePractitionerId);
  const bookingPractitionerId = selectedSlotPractitionerId || eligiblePractitioners[0]?.id || '';
  const hasPatientDetails = Boolean(patientName.trim() && patientPhone.trim() && patientEmail.trim());
  const canSave = Boolean(selectedTime && bookingPractitionerId && hasPatientDetails);

  const currentStep = !hasPatientDetails ? 1 : !selectedTime ? 2 : 3;

  async function handleReceptionRefresh() {
    await refresh();
    showAdminToast('Reception diary refreshed.', 'info');
  }

  async function handleCustomerSearch() {
    const query = customerSearch.trim();
    setSaveMessage('');

    if (query.length < 2) {
      setCustomerSearchMessage('Type at least two characters to search clients.');
      setCustomerResults([]);
      return;
    }

    setCustomerSearching(true);
    setCustomerSearchMessage('Searching clients…');
    try {
      const response = await fetch(`/api/customers?query=${encodeURIComponent(query)}`, { cache: 'no-store', headers: makeAdminAuthHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Client search failed.');
      const results = Array.isArray(payload.customers) ? payload.customers as Customer[] : [];
      setCustomerResults(results);
      setCustomerSearchMessage(results.length ? `${results.length} matching client${results.length === 1 ? '' : 's'} found.` : 'No matching client found. You can close this and use ad-hoc patient mode.');
    } catch (error) {
      setCustomerSearchMessage(error instanceof Error ? error.message : 'Client search failed.');
    } finally {
      setCustomerSearching(false);
    }
  }

  function selectCustomer(customer: Customer) {
    setReceptionMode('search');
    setSelectedCustomer(customer);
    setPatientName(customer.fullName);
    setPatientPhone(customer.phone);
    setPatientEmail(customer.email);
    setCustomerSearch(`${customer.fullName} ${customer.phone}`);
    setCustomerSearchMessage(`${customer.fullName} selected for this booking.`);
    setSaveMessage('');
    setClientPopupOpen(false);
    showAdminToast(`${customer.fullName} selected.`, 'info');
  }

  function startAdhocPatient() {
    setReceptionMode('adhoc');
    setSelectedCustomer(null);
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setCustomerSearch('');
    setCustomerResults([]);
    setCustomerSearchMessage('Ad-hoc patient mode selected. This creates the booking/customer details only, not a client login account.');
    setSaveMessage('');
    setClientPopupOpen(false);
  }

  function clearSelectedClient() {
    setSelectedCustomer(null);
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setCustomerSearchMessage('Client selection cleared. Search again or use ad-hoc patient mode.');
    setSaveMessage('');
  }


  function buildReceptionCopyText(booking: ReceptionSuccessBooking) {
    return [
      'Booking confirmed',
      `Patient: ${booking.patientName}`,
      `Phone: ${booking.patientPhone}`,
      `Email: ${booking.patientEmail}`,
      `Treatment: ${booking.treatment} · ${booking.duration} mins`,
      `Date: ${booking.dateLabel}`,
      `Time: ${booking.time}`,
      `Practitioner: ${booking.practitioner}`,
      `Booking ID: ${booking.id}`
    ].join('\n');
  }

  async function copyReceptionBookingDetails() {
    if (!successBooking) return;

    try {
      await navigator.clipboard.writeText(buildReceptionCopyText(successBooking));
      setCopyStatus('Copied');
      showAdminToast('Booking details copied.', 'info');
      window.setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('Copy failed');
      window.setTimeout(() => setCopyStatus(''), 2500);
    }
  }

  function startNextReceptionBooking() {
    setSuccessBooking(null);
    setCopyStatus('');
    setSelectedCustomer(null);
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setCustomerSearch('');
    setCustomerResults([]);
    setReceptionMode('search');
    setSelectedTime('');
    setNotes('');
    setCustomerSearchMessage('Open client search to find an existing client, or use ad-hoc patient mode.');
    setSaveMessage('');
  }

  async function handleSaveBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage('');
    if (!canSave) {
      setSaveMessage('Choose a client/patient, procedure, practitioner, date and available time before saving.');
      return;
    }

    try {
      const booking: Booking = await createBooking({
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientEmail: patientEmail.trim(),
        customerId: selectedCustomer?.id,
        procedureId: activeProcedureId,
        practitionerId: bookingPractitionerId,
        date: selectedDate,
        time: selectedTime,
        source: 'staff',
        notes: notes.trim()
      });

      showAdminToast('Booking confirmed and saved.');
      setSuccessBooking({
        id: booking.id,
        patientName: booking.patientName,
        patientPhone: booking.patientPhone,
        patientEmail: booking.patientEmail,
        treatment: procedureName(booking.procedureId, procedures),
        duration: procedureDuration(booking.procedureId, procedures),
        practitioner: practitionerName(booking.practitionerId, practitioners),
        dateLabel: getDayLabel(booking.date),
        time: `${booking.time}–${booking.endTime}`
      });
      setCopyStatus('');
      setSelectedCustomer(null);
      setPatientName('');
      setPatientPhone('');
      setPatientEmail('');
      setCustomerSearch('');
      setCustomerResults([]);
      setReceptionMode('search');
      setSelectedTime('');
      setNotes('');
      setCustomerSearchMessage('Booking confirmed. Client cleared ready for the next booking.');
      await refresh();
    } catch {
      setSaveMessage('The booking could not be saved. Check the diary notice above and try again.');
    }
  }

  return (
    <main className="shell fresh-shell admin-shell reception-shell">
      <Header area="admin" />

      <section className="admin-command reception-command">
        <div>
          <p className="badge blue-badge">Reception booking page · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Add booking.</h1>
          <p className="hero-copy tight-copy">A guided receptionist flow: choose the client, choose the appointment, then confirm the live booking.</p>
        </div>
        <div className="command-actions">
          <Link className="pill" href="/admin">Back to diary</Link>
          <button type="button" onClick={() => void handleReceptionRefresh()} disabled={saving || loading} className={`pill admin-action-button ${loading ? 'is-loading' : ''}`}><span className="refresh-icon" aria-hidden="true">↻</span>{loading ? 'Refreshing…' : 'Refresh diary'}</button>
        </div>
      </section>

      {error && (
        <div className="notice warning" role="alert">
          {error}
          <div style={{ marginTop: 10 }}><button type="button" onClick={() => void handleReceptionRefresh()} className={`pill admin-action-button ${loading ? 'is-loading' : ''}`}><span className="refresh-icon" aria-hidden="true">↻</span>{loading ? 'Retrying…' : 'Retry database connection'}</button></div>
        </div>
      )}

      {saveMessage && <div className="notice warning">{saveMessage}</div>}

      <form className="reception-booking-flow" onSubmit={handleSaveBooking}>
        <div className="reception-stepper" aria-label="Reception booking progress">
          <span className={currentStep >= 1 ? 'active' : ''}>1. Client</span>
          <span className={currentStep >= 2 ? 'active' : ''}>2. Appointment</span>
          <span className={currentStep >= 3 ? 'active' : ''}>3. Confirm</span>
        </div>

        <section className="card clean-panel reception-card reception-flow-card">
          <div className="section-heading-row compact-row">
            <div>
              <p className="badge blue-badge">Step 1</p>
              <h2 className="section-title compact">Select client</h2>
              <p className="mini-copy">Open search, select the client in the popup, then continue the booking flow.</p>
            </div>
            <button className="button primary" type="button" onClick={() => setClientPopupOpen(true)}>Search client</button>
          </div>

          <div className="reception-client-choice-row">
            <button className={`reception-choice ${receptionMode === 'search' ? 'active' : ''}`} type="button" onClick={() => setClientPopupOpen(true)}>
              <span>Existing client</span>
              <strong>{selectedCustomer ? selectedCustomer.fullName : 'Search and select'}</strong>
              <small>{selectedCustomer ? `${selectedCustomer.phone} · ${selectedCustomer.email}` : 'Find by name, phone or email'}</small>
            </button>
            <button className={`reception-choice ${receptionMode === 'adhoc' ? 'active' : ''}`} type="button" onClick={startAdhocPatient}>
              <span>Ad-hoc patient</span>
              <strong>Enter details manually</strong>
              <small>Useful for walk-ins or patients without an account</small>
            </button>
          </div>

          {selectedCustomer && (
            <article className="selected-client-card flow-selected-client">
              <div>
                <span>Selected client</span>
                <strong>{selectedCustomer.fullName}</strong>
                <small>{selectedCustomer.phone} · {selectedCustomer.email}</small>
                <small>{selectedCustomer.hasClientLogin ? 'Client login enabled' : 'No client login account'}</small>
              </div>
              <div className="selected-client-actions">
                <button className="pill" type="button" onClick={() => setClientPopupOpen(true)}>Change</button>
                <button className="pill" type="button" onClick={clearSelectedClient}>Clear</button>
              </div>
            </article>
          )}

          {receptionMode === 'adhoc' && (
            <div className="reception-details-grid flow-details-grid">
              <div className="form-row"><label>Patient name</label><input value={patientName} onChange={(event) => { setPatientName(event.target.value); setSelectedCustomer(null); }} placeholder="Patient full name" required /></div>
              <div className="form-row"><label>Mobile</label><input value={patientPhone} onChange={(event) => { setPatientPhone(event.target.value); setSelectedCustomer(null); }} placeholder="+254..." required /></div>
              <div className="form-row full"><label>Email</label><input value={patientEmail} onChange={(event) => { setPatientEmail(event.target.value); setSelectedCustomer(null); }} type="email" placeholder="patient@example.com" required /></div>
            </div>
          )}
        </section>

        <section className="card clean-panel reception-card reception-flow-card">
          <div className="section-heading-row compact-row">
            <div>
              <p className="badge blue-badge">Step 2</p>
              <h2 className="section-title compact">Choose appointment</h2>
              <p className="mini-copy">Slots are checked against the full procedure duration before they can be selected.</p>
            </div>
            <span className="duration-pill">{procedureDuration(activeProcedureId, procedures)} mins</span>
          </div>

          <div className="grid three controls-grid reception-controls-grid">
            <div className="form-row">
              <label>Date</label>
              <input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedTime(''); }} />
            </div>
            <div className="form-row">
              <label>Procedure</label>
              <select value={activeProcedureId} onChange={(event) => { setProcedureId(event.target.value); setSelectedTime(''); setSelectedPractitionerId(FIRST_AVAILABLE); }}>
                {procedures.map((procedure) => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Practitioner</label>
              <select value={activePractitionerId} onChange={(event) => { setSelectedPractitionerId(event.target.value); setSelectedTime(''); }}>
                <option value={FIRST_AVAILABLE}>First available</option>
                {eligiblePractitioners.map((practitioner) => <option key={practitioner.id} value={practitioner.id}>{practitioner.name} — {practitioner.role}</option>)}
              </select>
            </div>
          </div>

          <div className="reception-day-note">
            <strong>{loading ? 'Loading diary…' : getDayLabel(selectedDate)}</strong>
            <span>{selectedTime ? `Selected ${selectedTime}–${selectedSlot?.endTime ?? ''}` : 'Choose an available start time below.'}</span>
          </div>

          <div className="slot-grid reception-slot-grid flow-slot-grid">
            {receptionSlots.map((slot) => {
              const isSelectedSlot = selectedTime === slot.time;
              const isCoveredBySelection = Boolean(
                selectedSlot && slotStartsInsideSelectedAppointment(slot.time, selectedSlot.time, selectedSlot.endTime)
              );
              const slotPractitioner = slot.practitionerId ? practitionerName(slot.practitionerId, practitioners) : slot.practitionerName;
              return (
                <button
                  key={`${slot.time}-${slot.endTime}-reception`}
                  className={`slot ${slot.available ? 'available' : 'unavailable'} ${isSelectedSlot ? 'selected' : ''} ${isCoveredBySelection ? 'covered' : ''}`}
                  disabled={!slot.available || saving}
                  type="button"
                  onClick={() => setSelectedTime(slot.time)}
                >
                  <strong>{slot.time}</strong>
                  <span>{isCoveredBySelection ? 'Included in selected appointment' : slot.available ? `${slot.time}–${slot.endTime}` : slot.reason ?? 'Unavailable'}</span>
                  {slot.available && <em>{slotPractitioner || `${slot.availablePractitioners?.length ?? 1} clinician free`}</em>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="card clean-panel reception-card reception-flow-card">
          <div>
            <p className="badge blue-badge">Step 3</p>
            <h2 className="section-title compact">Confirm booking</h2>
            <p className="mini-copy">Review the receptionist booking before saving it into the live diary.</p>
          </div>

          <div className="confirmation-card reception-summary-card flow-summary-card">
            <h3>{patientName || 'Patient not selected'}</h3>
            <p>{selectedCustomer ? 'Existing client selected' : receptionMode === 'adhoc' ? 'Ad-hoc patient booking' : 'Search/select a client or use ad-hoc mode'}</p>
            <p>{patientPhone || 'No mobile'} · {patientEmail || 'No email'}</p>
            <p>{procedureName(activeProcedureId, procedures)} · {procedureDuration(activeProcedureId, procedures)} mins</p>
            <p>{bookingPractitionerId ? practitionerName(bookingPractitionerId, practitioners) : 'Choose a practitioner/time'}</p>
            <p>{getDayLabel(selectedDate)} · {selectedTime ? `${selectedTime}–${selectedSlot?.endTime ?? ''}` : 'No time selected'}</p>
          </div>

          <div className="form-row">
            <label>Reception notes</label>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes for the diary." />
          </div>

          <div className="reception-save-actions">
            <Link className="pill" href="/admin">Cancel</Link>
            <button type="submit" disabled={!canSave || saving || Boolean(error)} className={`button primary large-cta admin-busy-button ${saving ? 'is-loading' : ''}`}>{saving && <span className="admin-spinner" aria-hidden="true" />}{saving ? 'Checking diary…' : 'Save confirmed booking'}</button>
          </div>
        </section>
      </form>


      {successBooking && (
        <section className="booking-success-page reception-success-page" aria-labelledby="reception-success-title" role="dialog" aria-modal="true">
          <div className="booking-success-card reception-success-card">
            <div className="booking-success-head">
              <p className="badge blue-badge">Booking confirmed</p>
              <h2 id="reception-success-title">Appointment confirmed.</h2>
              <p className="mini-copy success-mini-copy">Reception booking saved. Use Copy to save or share the details.</p>
            </div>

            <div className="booking-success-body">
              <div className="success-details-card">
                <div className="success-details-head">
                  <strong>Booking details</strong>
                  <button className="copy-details-button" type="button" onClick={copyReceptionBookingDetails} aria-label="Copy booking details">
                    <span aria-hidden="true">⧉</span>
                    {copyStatus || 'Copy'}
                  </button>
                </div>
                <div className="success-detail-grid">
                  <p><strong>Patient</strong><span>{successBooking.patientName}</span></p>
                  <p><strong>Phone</strong><span>{successBooking.patientPhone}</span></p>
                  <p><strong>Email</strong><span>{successBooking.patientEmail}</span></p>
                  <p><strong>Treatment</strong><span>{successBooking.treatment} · {successBooking.duration} mins</span></p>
                  <p><strong>Date</strong><span>{successBooking.dateLabel}</span></p>
                  <p><strong>Time</strong><span>{successBooking.time}</span></p>
                  <p><strong>Practitioner</strong><span>{successBooking.practitioner}</span></p>
                  <p><strong>Booking ID</strong><span>{successBooking.id}</span></p>
                </div>
              </div>
            </div>

            <div className="success-actions">
              <button className="button primary" type="button" onClick={startNextReceptionBooking}>Add next booking</button>
              <Link className="pill" href="/admin">Back to diary</Link>
            </div>
          </div>
        </section>
      )}

      {clientPopupOpen && (
        <div className="client-auth-popup reception-client-popup-overlay" role="dialog" aria-modal="true" aria-label="Select client">
          <div className="client-auth-card client-reset-card reception-client-search-popup">
            <div className="client-auth-header reception-popup-header">
              <div>
                <p className="badge blue-badge">Step 1 · Client search</p>
                <h2>Select client</h2>
                <p>Search by name, phone or email, then choose a client to continue the booking.</p>
              </div>
              <button className="client-auth-close" type="button" onClick={() => setClientPopupOpen(false)} aria-label="Close client search">×</button>
            </div>

            <div className="client-auth-body reception-popup-body">
              <div className="customer-search-row reception-search-row">
                <input
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleCustomerSearch();
                    }
                  }}
                  placeholder="Search name, phone or email"
                  autoFocus
                />
                <button type="button" onClick={() => void handleCustomerSearch()} disabled={customerSearching} className={`button primary admin-busy-button ${customerSearching ? 'is-loading' : ''}`}>{customerSearching && <span className="admin-spinner" aria-hidden="true" />}{customerSearching ? 'Searching…' : 'Search'}</button>
              </div>

              {customerSearchMessage && <p className="mini-copy customer-search-message">{customerSearchMessage}</p>}

              <div className="customer-result-list reception-results reception-popup-results">
                {customerResults.length > 0 ? customerResults.map((customer) => (
                  <button className="customer-result reception-client-result-row" type="button" key={customer.id} onClick={() => selectCustomer(customer)}>
                    <strong>{customer.fullName}</strong>
                    <span>{customer.phone || 'No phone number'}</span>
                  </button>
                )) : (
                  <div className="empty-state compact-empty-state">
                    <strong>No client selected yet</strong>
                    <span>Run a search above, or close this popup and use ad-hoc patient mode.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="client-auth-bottom reception-popup-actions">
              <button className="pill" type="button" onClick={() => setClientPopupOpen(false)}>Cancel</button>
              <button className="pill" type="button" onClick={startAdhocPatient}>Use ad-hoc patient</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
