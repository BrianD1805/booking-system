'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION, procedureName, type BookingStatus } from '@/lib/mockData';
import { getAvailabilityForDate, getDateOffset, getDayLabel } from '@/lib/availability';
import { useBookingDatabase } from '@/lib/useBookingDatabase';

export default function AdminPage() {
  const [selectedDate, setSelectedDate] = useState(getDateOffset(3));
  const [procedureId, setProcedureId] = useState('checkup');
  const [selectedTime, setSelectedTime] = useState('');
  const [lateMessage, setLateMessage] = useState('The dentist is running around 15 minutes late. Thank you for your patience.');
  const { bootstrap, bookings, loading, saving, error, createBooking, updateBookingStatus, deleteBooking, refresh } = useBookingDatabase(selectedDate);
  const { practiceSettings, procedures, blockedDates, blockedTimes } = bootstrap;
  const activeProcedureId = procedures.find((procedure) => procedure.id === procedureId)?.id ?? procedures[0]?.id ?? procedureId;
  const slots = useMemo(
    () => getAvailabilityForDate(bookings, selectedDate, activeProcedureId, { practiceSettings, procedures, blockedDates, blockedTimes }),
    [bookings, selectedDate, activeProcedureId, practiceSettings, procedures, blockedDates, blockedTimes]
  );
  const dateBookings = bookings
    .filter((booking) => booking.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  async function handleAdminBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTime) return;

    const form = new FormData(event.currentTarget);

    try {
      await createBooking({
        patientName: String(form.get('patientName') ?? ''),
        patientPhone: String(form.get('patientPhone') ?? ''),
        patientEmail: String(form.get('patientEmail') ?? ''),
        procedureId: activeProcedureId,
        date: selectedDate,
        time: selectedTime,
        source: 'staff',
        notes: String(form.get('notes') ?? '')
      });

      setSelectedTime('');
      event.currentTarget.reset();
    } catch {
      // Error is surfaced by the hook in the page notice.
    }
  }

  return (
    <main className="shell">
      <Header area="admin" />
      <section className="hero">
        <div className="card">
          <p className="badge">Owner/admin app · {APP_VERSION}</p>
          <h1 className="hero-title">Live practice diary.</h1>
          <p className="hero-copy">
            Staff can create confirmed bookings directly, view client-created bookings, cancel, complete or delete appointments, and send running-late messages.
          </p>
          <div className="grid two">
            <div className="stat"><strong>{practiceSettings.workingStartTime}–{practiceSettings.workingEndTime}</strong><span>Working hours from Netlify Database</span></div>
            <div className="stat"><strong>{bookings.filter((booking) => booking.status !== 'cancelled').length}</strong><span>Bookings loaded from shared database for selected day</span></div>
          </div>
          {error && (
            <div className="notice warning" role="alert">
              {error}<br />
              Run the Netlify Database setup steps in the README, then refresh this page.
              <div style={{ marginTop: 10 }}><button className="pill" type="button" onClick={refresh}>Retry database connection</button></div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title compact">Running late message</h2>
          <p className="hero-copy">Fast update to affected patients by push notification first, with SMS fallback later.</p>
          <div className="form-row">
            <label htmlFor="lateMessage">Message text</label>
            <textarea id="lateMessage" value={lateMessage} onChange={(event) => setLateMessage(event.target.value)} />
          </div>
          <button className="button orange" type="button">Preview send to selected day’s patients</button>
        </div>
      </section>

      <section className="card diary-panel">
        <div className="section-heading-row">
          <div>
            <h2 className="section-title compact">Diary date and availability</h2>
            <p className="mini-copy">{loading ? 'Loading diary from Netlify Database…' : getDayLabel(selectedDate)}</p>
          </div>
          <button className="pill" type="button" onClick={refresh} disabled={saving}>Refresh database diary</button>
        </div>

        <div className="grid two">
          <div className="form-row">
            <label htmlFor="adminDate">Diary date</label>
            <input id="adminDate" type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setSelectedTime(''); }} />
          </div>
          <div className="form-row">
            <label htmlFor="adminProcedure">Procedure duration for slot check</label>
            <select id="adminProcedure" value={activeProcedureId} onChange={(event) => { setProcedureId(event.target.value); setSelectedTime(''); }}>
              {procedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>{procedure.name} — {procedure.durationMinutes} mins</option>
              ))}
            </select>
          </div>
        </div>

        <div className="slot-grid admin-slots">
          {slots.map((slot) => (
            <button
              key={`${slot.time}-${slot.endTime}`}
              className={`slot ${slot.available ? 'available' : 'unavailable'} ${selectedTime === slot.time ? 'selected' : ''}`}
              disabled={!slot.available || saving}
              type="button"
              title={slot.reason ?? `Available until ${slot.endTime}`}
              onClick={() => setSelectedTime(slot.time)}
            >
              <strong>{slot.time}</strong>
              <span>{slot.available ? `${slot.endTime}` : slot.reason ?? 'Unavailable'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="hero admin-create">
        <form className="card" onSubmit={handleAdminBooking}>
          <h2 className="section-title compact">Add staff booking</h2>
          <p className="mini-copy">This creates a confirmed appointment immediately, the same as a client booking.</p>
          <div className="form-row">
            <label htmlFor="patientName">Patient name</label>
            <input id="patientName" name="patientName" placeholder="Patient full name" required />
          </div>
          <div className="grid two">
            <div className="form-row">
              <label htmlFor="patientPhone">Mobile</label>
              <input id="patientPhone" name="patientPhone" placeholder="+254..." required />
            </div>
            <div className="form-row">
              <label htmlFor="patientEmail">Email</label>
              <input id="patientEmail" name="patientEmail" type="email" placeholder="patient@example.com" required />
            </div>
          </div>
          <div className="form-row">
            <label htmlFor="notes">Admin notes</label>
            <textarea id="notes" name="notes" placeholder="Optional notes for the diary." />
          </div>
          <button className="button primary full" type="submit" disabled={!selectedTime || saving || Boolean(error)}>
            {saving ? 'Saving booking…' : selectedTime ? `Add confirmed booking at ${selectedTime}` : 'Choose an available diary slot'}
          </button>
        </form>

        <div className="card">
          <h2 className="section-title compact">Selected date bookings</h2>
          <section className="booking-list">
            {dateBookings.length === 0 && <p className="notice">No bookings on this date yet.</p>}
            {dateBookings.map((booking) => (
              <article className="booking-item" key={booking.id}>
                <div>
                  <strong>{booking.time}–{booking.endTime} · {booking.patientName}</strong>
                  <small>{procedureName(booking.procedureId, procedures)} · {booking.patientPhone} · {booking.patientEmail}</small>
                  <small>Source: {booking.source}. Status: <span className={`status status-${booking.status}`}>{booking.status}</span></small>
                  <small>Notes: {booking.notes || 'None'}</small>
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
        </div>
      </section>

      <h2 className="section-title">Procedures and allocated time</h2>
      <section className="grid three">
        {procedures.map((procedure) => (
          <article className="card" key={procedure.id}>
            <h3 style={{ marginTop: 0 }}>{procedure.name}</h3>
            <p className="hero-copy">Allocated time: <strong>{procedure.durationMinutes} minutes</strong></p>
            <p className="badge">{procedure.priceGuide}</p>
          </article>
        ))}
      </section>

      <h2 className="section-title">Settings placeholders</h2>
      <section className="grid three">
        <div className="stat"><strong>Blocked diary</strong><span>Block days, half-days, lunch breaks, emergency closures and annual leave.</span></div>
        <div className="stat"><strong>Reminder timing</strong><span>Choose 1 day before, 1 hour before, both, or custom.</span></div>
        <div className="stat"><strong>Tenant data mode</strong><span>{practiceSettings.medicalDataMode}</span></div>
      </section>
      <p className="footer-note">Owner/admin installable app by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
