'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { practiceSettings, procedures, seedBookings, procedureName, type Booking } from '@/lib/mockData';

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>(seedBookings);
  const [lateMessage, setLateMessage] = useState('The dentist is running around 15 minutes late. Thank you for your patience.');

  function updateStatus(id: string, status: Booking['status']) {
    setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status } : booking));
  }

  function deleteBooking(id: string) {
    setBookings((current) => current.filter((booking) => booking.id !== id));
  }

  return (
    <main className="shell">
      <Header area="admin" />
      <section className="hero">
        <div className="card">
          <p className="badge">Owner/admin app</p>
          <h1 className="hero-title">Practice diary control centre.</h1>
          <p className="hero-copy">
            Manage bookings, procedure times, leave blocks, reminder preferences and patient messages. This first version uses mock bookings so we can shape the workflow before database work.
          </p>
          <div className="grid two">
            <div className="stat"><strong>{practiceSettings.workingHours}</strong><span>Working hours setting placeholder</span></div>
            <div className="stat"><strong>{bookings.length}</strong><span>Demo bookings currently loaded</span></div>
          </div>
        </div>
        <div className="card">
          <h2 className="section-title" style={{ marginTop: 0 }}>Running late message</h2>
          <p className="hero-copy">Send a fast update to affected patients by push notification first, with SMS fallback later.</p>
          <div className="form-row">
            <label htmlFor="lateMessage">Message text</label>
            <textarea id="lateMessage" value={lateMessage} onChange={(event) => setLateMessage(event.target.value)} />
          </div>
          <button className="button orange" type="button">Preview send to today’s patients</button>
        </div>
      </section>

      <h2 className="section-title">Today’s bookings</h2>
      <section className="booking-list">
        {bookings.map((booking) => (
          <article className="booking-item" key={booking.id}>
            <div>
              <strong>{booking.time} — {booking.patientName}</strong>
              <small>{procedureName(booking.procedureId)} · {booking.date} · {booking.patientPhone} · {booking.patientEmail}</small>
              <small>Status: {booking.status}. Notes: {booking.notes ?? 'None'}</small>
            </div>
            <div className="nav-pills">
              <button className="pill" type="button" onClick={() => updateStatus(booking.id, 'confirmed')}>Confirm</button>
              <button className="pill" type="button" onClick={() => updateStatus(booking.id, 'rescheduled')}>Reschedule</button>
              <button className="pill" type="button" onClick={() => updateStatus(booking.id, 'cancelled')}>Cancel</button>
              <button className="pill" type="button" onClick={() => deleteBooking(booking.id)}>Delete</button>
            </div>
          </article>
        ))}
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
        <div className="stat"><strong>Leave blocks</strong><span>Block out days, half-days, emergency closures and annual leave.</span></div>
        <div className="stat"><strong>Reminder timing</strong><span>Choose 1 day before, 1 hour before, both, or custom.</span></div>
        <div className="stat"><strong>Tenant data mode</strong><span>{practiceSettings.medicalDataMode}</span></div>
      </section>
      <p className="footer-note">Owner/admin installable app by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
