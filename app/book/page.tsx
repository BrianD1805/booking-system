'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION, practiceSettings, procedures, procedureDuration } from '@/lib/mockData';
import { createBooking, getAvailabilityForDate, getDateOffset, getDayLabel } from '@/lib/availability';
import { useLiveBookings } from '@/lib/useLiveBookings';

export default function BookPage() {
  const { bookings, setBookings } = useLiveBookings();
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [procedureId, setProcedureId] = useState(procedures[0]?.id ?? '');
  const [selectedDate, setSelectedDate] = useState(getDateOffset(3));
  const [selectedTime, setSelectedTime] = useState('');
  const selectedProcedure = useMemo(() => procedures.find((item) => item.id === procedureId), [procedureId]);
  const slots = useMemo(() => getAvailabilityForDate(bookings, selectedDate, procedureId), [bookings, selectedDate, procedureId]);
  const availableSlots = slots.filter((slot) => slot.available);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!selectedTime) return;

    const newBooking = createBooking({
      patientName: String(form.get('patientName') ?? ''),
      patientPhone: String(form.get('patientPhone') ?? ''),
      patientEmail: String(form.get('patientEmail') ?? ''),
      procedureId,
      date: selectedDate,
      time: selectedTime,
      source: 'client',
      notes: String(form.get('notes') ?? '')
    });

    setBookings((current) => [...current, newBooking]);
    setConfirmedBookingId(newBooking.id);
    setSelectedTime('');
    event.currentTarget.reset();
  }

  return (
    <main className="shell">
      <Header area="client" />
      <section className="hero">
        <div className="card">
          <p className="badge">Client booking app · {APP_VERSION}</p>
          <h1 className="hero-title">Book a live appointment.</h1>
          <p className="hero-copy">
            Patients choose a procedure, browse the diary by date and book one of the available times. This is a live booking workflow, not an application form or request queue.
          </p>
          <div className="notice">
            Demo reminders: {practiceSettings.reminderOptions.join(', ')}. Push notifications first, SMS as fallback.
          </div>
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
                value={procedureId}
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
            <p className="notice">Selected: {selectedProcedure.name}. Appointment length: {procedureDuration(procedureId)} minutes.</p>
          )}

          <h2 className="section-title compact">3. Available times</h2>
          <p className="mini-copy">{getDayLabel(selectedDate)} · {availableSlots.length} available time{availableSlots.length === 1 ? '' : 's'}</p>
          <div className="slot-grid" role="list" aria-label="Available appointment times">
            {slots.map((slot) => (
              <button
                key={`${slot.time}-${slot.endTime}`}
                className={`slot ${slot.available ? 'available' : 'unavailable'} ${selectedTime === slot.time ? 'selected' : ''}`}
                disabled={!slot.available}
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

          <button className="button primary full" type="submit" disabled={!selectedTime}>
            {selectedTime ? `Book ${selectedTime} appointment` : 'Choose an available time'}
          </button>

          {confirmedBookingId && (
            <p className="notice success" role="status">
              Appointment confirmed and added to the shared diary. Open the admin app to see it immediately.
            </p>
          )}
        </form>
      </section>

      <section className="card diary-panel">
        <h2 className="section-title compact">How this must work when database-connected</h2>
        <div className="grid three">
          <div className="stat"><strong>Live booking</strong><span>Client-created bookings become confirmed diary records immediately.</span></div>
          <div className="stat"><strong>Synced diary</strong><span>Admin and client apps read from the same booking source.</span></div>
          <div className="stat"><strong>Availability first</strong><span>Only genuinely available times should be offered to clients.</span></div>
        </div>
      </section>

      <p className="footer-note">Client-facing installable app by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
