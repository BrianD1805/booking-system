'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION, procedureDuration } from '@/lib/mockData';
import { getAvailabilityForDate, getDateOffset, getDayLabel } from '@/lib/availability';
import { useBookingDatabase } from '@/lib/useBookingDatabase';

export default function BookPage() {
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [procedureId, setProcedureId] = useState('checkup');
  const [selectedDate, setSelectedDate] = useState(getDateOffset(3));
  const [selectedTime, setSelectedTime] = useState('');
  const { bootstrap, bookings, loading, saving, error, createBooking, refresh } = useBookingDatabase(selectedDate);
  const { practiceSettings, procedures, blockedDates, blockedTimes } = bootstrap;
  const selectedProcedure = useMemo(() => procedures.find((item) => item.id === procedureId) ?? procedures[0], [procedureId, procedures]);
  const activeProcedureId = selectedProcedure?.id ?? procedureId;
  const slots = useMemo(
    () => getAvailabilityForDate(bookings, selectedDate, activeProcedureId, { practiceSettings, procedures, blockedDates, blockedTimes }),
    [bookings, selectedDate, activeProcedureId, practiceSettings, procedures, blockedDates, blockedTimes]
  );
  const availableSlots = slots.filter((slot) => slot.available);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!selectedTime) return;

    try {
      const newBooking = await createBooking({
        patientName: String(form.get('patientName') ?? ''),
        patientPhone: String(form.get('patientPhone') ?? ''),
        patientEmail: String(form.get('patientEmail') ?? ''),
        procedureId: activeProcedureId,
        date: selectedDate,
        time: selectedTime,
        source: 'client',
        notes: String(form.get('notes') ?? '')
      });

      setConfirmedBookingId(newBooking.id);
      setSelectedTime('');
      event.currentTarget.reset();
    } catch {
      // Error is surfaced by the hook in the page notice.
    }
  }

  return (
    <main className="shell">
      <Header area="client" />
      <section className="hero">
        <div className="card">
          <p className="badge">Client booking app · {APP_VERSION}</p>
          <h1 className="hero-title">Book a live appointment.</h1>
          <p className="hero-copy">
            Patients choose a procedure, browse the diary by date and book one of the available times. This is a live booking workflow, connected through the shared Netlify Database.
          </p>
          <div className="notice">
            Database-backed diary: client and admin apps read and write through the same booking API. Reminders later: {practiceSettings.reminderOptions.join(', ')}.
          </div>
          {error && (
            <div className="notice warning" role="alert">
              {error}<br />
              Run the Netlify Database setup steps in the README, then refresh this page.
              <div style={{ marginTop: 10 }}><button className="pill" type="button" onClick={refresh}>Retry database connection</button></div>
            </div>
          )}
        </div>

        <form className="card" onSubmit={handleSubmit}>
          <h2 className="section-title compact">1. Your details</h2>
          <div className="form-row">
            <label htmlFor="patientName">Full name</label>
            <input id="patientName" name="patientName" placeholder="Your full name" required />
          </div>
          <div className="grid two">
            <div className="form-row">
              <label htmlFor="patientPhone">Mobile number</label>
              <input id="patientPhone" name="patientPhone" placeholder="+254..." required />
            </div>
            <div className="form-row">
              <label htmlFor="patientEmail">Email address</label>
              <input id="patientEmail" name="patientEmail" type="email" placeholder="you@example.com" required />
            </div>
          </div>

          <h2 className="section-title compact">2. Choose procedure and date</h2>
          <div className="grid two">
            <div className="form-row">
              <label htmlFor="procedure">Procedure</label>
              <select
                id="procedure"
                name="procedure"
                value={activeProcedureId}
                onChange={(event) => {
                  setProcedureId(event.target.value);
                  setSelectedTime('');
                }}
              >
                {procedures.map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>{procedure.name} — {procedure.durationMinutes} mins</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="date">Diary date</label>
              <input
                id="date"
                name="date"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedTime('');
                }}
                required
              />
            </div>
          </div>

          {selectedProcedure && (
            <p className="notice">Selected: {selectedProcedure.name}. Appointment length: {procedureDuration(activeProcedureId, procedures)} minutes.</p>
          )}

          <h2 className="section-title compact">3. Available times</h2>
          <p className="mini-copy">
            {loading ? 'Loading diary from Netlify Database…' : `${getDayLabel(selectedDate)} · ${availableSlots.length} available time${availableSlots.length === 1 ? '' : 's'}`}
          </p>
          <div className="slot-grid" role="list" aria-label="Available appointment times">
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
                <span>{slot.available ? `${slot.endTime}` : 'Unavailable'}</span>
              </button>
            ))}
          </div>

          <div className="form-row">
            <label htmlFor="notes">Notes for the practice</label>
            <textarea id="notes" name="notes" placeholder="Optional notes, symptoms, or preferred dentist." />
          </div>

          <button className="button primary full" type="submit" disabled={!selectedTime || saving || Boolean(error)}>
            {saving ? 'Saving confirmed booking…' : selectedTime ? `Book ${selectedTime} appointment` : 'Choose an available time'}
          </button>

          {confirmedBookingId && (
            <p className="notice success" role="status">
              Appointment confirmed and saved to Netlify Database. Open the admin app to see the same booking.
            </p>
          )}
        </form>
      </section>

      <section className="card diary-panel">
        <h2 className="section-title compact">Live diary foundation</h2>
        <div className="grid three">
          <div className="stat"><strong>Database-backed</strong><span>Bookings are read and written through Netlify Database APIs.</span></div>
          <div className="stat"><strong>Confirmed instantly</strong><span>A client booking becomes a confirmed diary record immediately.</span></div>
          <div className="stat"><strong>Availability first</strong><span>Clients only see times left open after bookings and blocked diary entries.</span></div>
        </div>
      </section>

      <p className="footer-note">Client-facing installable app by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
