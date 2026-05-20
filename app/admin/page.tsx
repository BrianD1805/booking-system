'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION, practitionerName, procedureName, type BookingStatus } from '@/lib/mockData';
import { getAvailabilityForDate, getDateOffset, getDayLabel, practitionersForProcedure } from '@/lib/availability';
import { useBookingDatabase } from '@/lib/useBookingDatabase';

type AdminStep = 0 | 1 | 2;

export default function AdminPage() {
  const [selectedDate, setSelectedDate] = useState(getDateOffset(0));
  const [procedureId, setProcedureId] = useState('checkup');
  const [selectedPractitionerId, setSelectedPractitionerId] = useState('practitioner_001');
  const [selectedTime, setSelectedTime] = useState('');
  const [adminBookingOpen, setAdminBookingOpen] = useState(false);
  const [adminStep, setAdminStep] = useState<AdminStep>(0);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [lateMessage, setLateMessage] = useState('The dentist is running around 15 minutes late. Thank you for your patience.');
  const { bootstrap, bookings, loading, saving, error, createBooking, updateBookingStatus, deleteBooking, refresh } = useBookingDatabase(selectedDate);
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
  const slots = useMemo(
    () => getAvailabilityForDate(bookings, selectedDate, activeProcedureId, context, activePractitionerId),
    [bookings, selectedDate, activeProcedureId, context, activePractitionerId]
  );
  const dateBookings = bookings
    .filter((booking) => booking.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time) || practitionerName(a.practitionerId, practitioners).localeCompare(practitionerName(b.practitionerId, practitioners)));
  const canSave = Boolean(selectedTime && activePractitionerId && patientName.trim() && patientPhone.trim() && patientEmail.trim());

  async function handleAdminBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    try {
      await createBooking({
        patientName,
        patientPhone,
        patientEmail,
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
        <div className="command-actions">
          <button className="button primary large-cta" type="button" onClick={() => setAdminBookingOpen(true)}>Add booking</button>
          <button className="pill" type="button" onClick={refresh} disabled={saving}>Refresh diary</button>
        </div>
      </section>

      {error && (
        <div className="notice warning" role="alert">
          {error}
          <div style={{ marginTop: 10 }}><button className="pill" type="button" onClick={refresh}>Retry database connection</button></div>
        </div>
      )}

      <section className="compact-dashboard">
        <article className="mini-card"><strong>{practitioners.filter((item) => item.active).length}</strong><span>Active clinicians</span></article>
        <article className="mini-card"><strong>{dateBookings.length}</strong><span>Bookings on this date</span></article>
        <article className="mini-card"><strong>{loading ? '…' : slots.filter((slot) => slot.available).length}</strong><span>Open slots</span></article>
      </section>

      <section className="card diary-panel clean-panel">
        <div className="section-heading-row">
          <div>
            <h2 className="section-title compact">Diary</h2>
            <p className="mini-copy">{loading ? 'Loading diary from Netlify Database…' : getDayLabel(selectedDate)}</p>
          </div>
        </div>

        <div className="grid three controls-grid">
          <div className="form-row">
            <label htmlFor="adminDate">Date</label>
            <input id="adminDate" type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedTime(''); }} />
          </div>
          <div className="form-row">
            <label htmlFor="adminProcedure">Procedure</label>
            <select id="adminProcedure" value={activeProcedureId} onChange={(event) => { setProcedureId(event.target.value); setSelectedTime(''); }}>
              {procedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>{procedure.name} — {procedure.durationMinutes} mins</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="adminPractitioner">Practitioner</label>
            <select id="adminPractitioner" value={activePractitionerId} onChange={(event) => { setSelectedPractitionerId(event.target.value); setSelectedTime(''); }}>
              {eligiblePractitioners.map((practitioner) => (
                <option key={practitioner.id} value={practitioner.id}>{practitioner.name} — {practitioner.role}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="slot-grid admin-slots">
          {slots.map((slot) => (
            <button
              key={`${slot.time}-${slot.endTime}-${slot.practitionerId ?? activePractitionerId}`}
              className={`slot ${slot.available ? 'available' : 'unavailable'} ${selectedTime === slot.time ? 'selected' : ''}`}
              disabled={!slot.available || saving}
              type="button"
              onClick={() => {
                setSelectedTime(slot.time);
                setAdminBookingOpen(true);
                setAdminStep(1);
              }}
            >
              <strong>{slot.time}</strong>
              <span>{slot.available ? `${slot.endTime} · free` : slot.reason ?? 'Unavailable'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card clean-panel">
        <div className="section-heading-row">
          <div>
            <h2 className="section-title compact">Bookings</h2>
            <p className="mini-copy">Selected date records from the shared Netlify Database.</p>
          </div>
        </div>
        <section className="booking-list visual-list">
          {dateBookings.length === 0 && <p className="notice">No bookings on this date yet.</p>}
          {dateBookings.map((booking) => (
            <article className="booking-item" key={booking.id}>
              <div>
                <strong>{booking.time}–{booking.endTime} · {booking.patientName}</strong>
                <small>{procedureName(booking.procedureId, procedures)} · {practitionerName(booking.practitionerId, practitioners)}</small>
                <small>{booking.patientPhone} · {booking.patientEmail}</small>
                <small>Source: {booking.source}. Status: <span className={`status status-${booking.status}`}>{booking.status}</span></small>
              </div>
              <div className="nav-pills booking-actions">
                <button className="pill" type="button" disabled={saving} onClick={() => updateBookingStatus(booking.id, 'confirmed' as BookingStatus)}>Confirm</button>
                <button className="pill" type="button" disabled={saving} onClick={() => updateBookingStatus(booking.id, 'completed' as BookingStatus)}>Complete</button>
                <button className="pill" type="button" disabled={saving} onClick={() => updateBookingStatus(booking.id, 'cancelled' as BookingStatus)}>Cancel</button>
                <button className="pill danger" type="button" disabled={saving} onClick={() => deleteBooking(booking.id)}>Delete</button>
              </div>
            </article>
          ))}
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
                  <input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedTime(''); }} />
                </div>
                <div className="form-row">
                  <label>Procedure</label>
                  <select value={activeProcedureId} onChange={(event) => { setProcedureId(event.target.value); setSelectedTime(''); }}>
                    {procedures.map((procedure) => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label>Practitioner</label>
                  <select value={activePractitionerId} onChange={(event) => { setSelectedPractitionerId(event.target.value); setSelectedTime(''); }}>
                    {eligiblePractitioners.map((practitioner) => <option key={practitioner.id} value={practitioner.id}>{practitioner.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="slot-grid popup-slots">
                {slots.map((slot) => (
                  <button key={`${slot.time}-${slot.endTime}-modal`} className={`slot ${slot.available ? 'available' : 'unavailable'} ${selectedTime === slot.time ? 'selected' : ''}`} disabled={!slot.available || saving} type="button" onClick={() => setSelectedTime(slot.time)}>
                    <strong>{slot.time}</strong>
                    <span>{slot.available ? slot.endTime : slot.reason ?? 'Unavailable'}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {adminStep === 1 && (
            <section className="flow-step">
              <div className="form-row"><label>Patient name</label><input value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Patient full name" required /></div>
              <div className="form-row"><label>Mobile</label><input value={patientPhone} onChange={(event) => setPatientPhone(event.target.value)} placeholder="+254..." required /></div>
              <div className="form-row"><label>Email</label><input value={patientEmail} onChange={(event) => setPatientEmail(event.target.value)} type="email" placeholder="patient@example.com" required /></div>
              <div className="form-row"><label>Notes</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes for the diary." /></div>
            </section>
          )}

          {adminStep === 2 && (
            <section className="flow-step">
              <div className="confirmation-card">
                <h3>Confirm staff booking</h3>
                <p>{patientName || 'Patient name required'}</p>
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
