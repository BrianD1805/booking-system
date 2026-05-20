'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION, procedureDuration } from '@/lib/mockData';
import { FIRST_AVAILABLE, getAvailabilityForDate, getDateOffset, getDayLabel, practitionersForProcedure } from '@/lib/availability';
import { useBookingDatabase } from '@/lib/useBookingDatabase';

export default function BookPage() {
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [procedureId, setProcedureId] = useState('checkup');
  const [practitionerChoice, setPractitionerChoice] = useState(FIRST_AVAILABLE);
  const [selectedDate, setSelectedDate] = useState(getDateOffset(3));
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedPractitionerId, setSelectedPractitionerId] = useState('');
  const { bootstrap, bookings, loading, saving, error, createBooking, refresh } = useBookingDatabase(selectedDate);
  const { practiceSettings, procedures, blockedDates, blockedTimes, practitioners } = bootstrap;
  const selectedProcedure = useMemo(() => procedures.find((item) => item.id === procedureId) ?? procedures[0], [procedureId, procedures]);
  const activeProcedureId = selectedProcedure?.id ?? procedureId;
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
  const slots = useMemo(
    () => getAvailabilityForDate(bookings, selectedDate, activeProcedureId, context, practitionerChoice),
    [bookings, selectedDate, activeProcedureId, context, practitionerChoice]
  );
  const availableSlots = slots.filter((slot) => slot.available);
  const selectedPractitioner = practitioners.find((item) => item.id === selectedPractitionerId);

  useEffect(() => {
    if (practitionerChoice !== FIRST_AVAILABLE && !eligiblePractitioners.some((item) => item.id === practitionerChoice)) {
      setPractitionerChoice(FIRST_AVAILABLE);
    }
  }, [eligiblePractitioners, practitionerChoice]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!selectedTime || !selectedPractitionerId) return;

    try {
      const newBooking = await createBooking({
        patientName: String(form.get('patientName') ?? ''),
        patientPhone: String(form.get('patientPhone') ?? ''),
        patientEmail: String(form.get('patientEmail') ?? ''),
        procedureId: activeProcedureId,
        practitionerId: selectedPractitionerId,
        date: selectedDate,
        time: selectedTime,
        source: 'client',
        notes: String(form.get('notes') ?? '')
      });

      setConfirmedBookingId(newBooking.id);
      setSelectedTime('');
      setSelectedPractitionerId('');
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
            Patients choose a procedure, pick a practitioner or first available, browse the diary by date and book a confirmed appointment through the shared Netlify Database.
          </p>
          <div className="notice">
            Conflict protected: each booking is checked on the server against the selected practitioner’s live diary before it is saved.
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

          <h2 className="section-title compact">2. Choose procedure, dentist and date</h2>
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
                  setSelectedPractitionerId('');
                }}
              >
                {procedures.map((procedure) => (
                  <option key={procedure.id} value={procedure.id}>{procedure.name} — {procedure.durationMinutes} mins</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="practitioner">Dentist / practitioner</label>
              <select
                id="practitioner"
                name="practitioner"
                value={practitionerChoice}
                onChange={(event) => {
                  setPractitionerChoice(event.target.value);
                  setSelectedTime('');
                  setSelectedPractitionerId('');
                }}
              >
                <option value={FIRST_AVAILABLE}>First available</option>
                {eligiblePractitioners.map((practitioner) => (
                  <option key={practitioner.id} value={practitioner.id}>{practitioner.name} — {practitioner.role}</option>
                ))}
              </select>
            </div>
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
                setSelectedPractitionerId('');
              }}
              required
            />
          </div>

          {selectedProcedure && (
            <p className="notice">Selected: {selectedProcedure.name}. Appointment length: {procedureDuration(activeProcedureId, procedures)} minutes. Eligible practitioners: {eligiblePractitioners.map((item) => item.name).join(', ') || 'None'}.</p>
          )}

          <h2 className="section-title compact">3. Available times</h2>
          <p className="mini-copy">
            {loading ? 'Loading diary from Netlify Database…' : `${getDayLabel(selectedDate)} · ${availableSlots.length} available time${availableSlots.length === 1 ? '' : 's'}`}
          </p>
          <div className="slot-grid" role="list" aria-label="Available appointment times">
            {slots.map((slot) => (
              <button
                key={`${slot.time}-${slot.endTime}-${slot.practitionerId ?? 'none'}`}
                className={`slot ${slot.available ? 'available' : 'unavailable'} ${selectedTime === slot.time && selectedPractitionerId === slot.practitionerId ? 'selected' : ''}`}
                disabled={!slot.available || saving}
                type="button"
                title={slot.reason ?? `Available with ${slot.practitionerName ?? 'practitioner'} until ${slot.endTime}`}
                onClick={() => {
                  setSelectedTime(slot.time);
                  setSelectedPractitionerId(slot.practitionerId ?? '');
                }}
              >
                <strong>{slot.time}</strong>
                <span>{slot.available ? `${slot.endTime} · ${slot.practitionerName}` : slot.reason ?? 'Unavailable'}</span>
              </button>
            ))}
          </div>

          {selectedTime && selectedPractitioner && (
            <p className="notice success">Ready to book {selectedTime} with {selectedPractitioner.name}.</p>
          )}

          <div className="form-row">
            <label htmlFor="notes">Notes for the practice</label>
            <textarea id="notes" name="notes" placeholder="Optional notes or symptoms." />
          </div>

          <button className="button primary full" type="submit" disabled={!selectedTime || !selectedPractitionerId || saving || Boolean(error)}>
            {saving ? 'Checking diary and saving…' : selectedTime ? `Book ${selectedTime} appointment` : 'Choose an available time'}
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
          <div className="stat"><strong>Practitioner-aware</strong><span>Availability now checks the selected dentist or hygienist, not just the practice.</span></div>
          <div className="stat"><strong>Confirmed instantly</strong><span>A client booking becomes a confirmed diary record immediately.</span></div>
          <div className="stat"><strong>Server protected</strong><span>The API refuses a booking if that practitioner is already booked.</span></div>
        </div>
      </section>

      <p className="footer-note">Client-facing installable app by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
