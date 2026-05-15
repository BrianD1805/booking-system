'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { procedures, practiceSettings } from '@/lib/mockData';

export default function BookPage() {
  const [submitted, setSubmitted] = useState(false);
  const [procedureId, setProcedureId] = useState(procedures[0]?.id ?? '');
  const selectedProcedure = useMemo(() => procedures.find((item) => item.id === procedureId), [procedureId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="shell">
      <Header area="client" />
      <section className="hero">
        <div className="card">
          <p className="badge">Client booking app</p>
          <h1 className="hero-title">Book your dental appointment.</h1>
          <p className="hero-copy">
            Patients can request an appointment, choose a procedure and receive push/SMS reminders once the booking is confirmed.
            This is currently mock data and will be connected to Supabase in a later patch.
          </p>
          <div className="notice">
            Demo reminders: {practiceSettings.reminderOptions.join(', ')}. Push notifications first, SMS as fallback.
          </div>
        </div>
        <form className="card" onSubmit={handleSubmit}>
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
          <div className="form-row">
            <label htmlFor="procedure">Procedure</label>
            <select id="procedure" name="procedure" value={procedureId} onChange={(event) => setProcedureId(event.target.value)}>
              {procedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>{procedure.name} — {procedure.durationMinutes} mins</option>
              ))}
            </select>
          </div>
          <div className="grid two">
            <div className="form-row">
              <label htmlFor="date">Preferred date</label>
              <input id="date" name="date" type="date" required />
            </div>
            <div className="form-row">
              <label htmlFor="time">Preferred time</label>
              <input id="time" name="time" type="time" required />
            </div>
          </div>
          <div className="form-row">
            <label htmlFor="notes">Notes for the practice</label>
            <textarea id="notes" name="notes" placeholder="Optional notes, symptoms, or preferred dentist." />
          </div>
          {selectedProcedure && (
            <p className="notice">Selected: {selectedProcedure.name}. Allocated time: {selectedProcedure.durationMinutes} minutes.</p>
          )}
          <button className="button primary" type="submit">Request appointment</button>
          {submitted && <p className="notice" role="status">Appointment request captured locally for this demo. Supabase saving comes in the database patch.</p>}
        </form>
      </section>
      <p className="footer-note">Client-facing installable app by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
