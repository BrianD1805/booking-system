'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION, procedureDuration, type ClientLoginProfile } from '@/lib/mockData';
import { FIRST_AVAILABLE, getAvailabilityForDate, getDateOffset, getDayLabel, practitionersForProcedure } from '@/lib/availability';
import { useBookingDatabase } from '@/lib/useBookingDatabase';
import { ClientInstallPrompt } from './ClientInstallPrompt';

const steps = ['Details', 'Treatment', 'Diary', 'Review'];

type FlowStep = 0 | 1 | 2 | 3;

type BookingSuccess = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  treatment: string;
  duration: number;
  dateLabel: string;
  time: string;
  practitioner: string;
  notes: string;
};

type LoginStage = 'request' | 'verify' | 'signed-in';

type ClientCodeResponse = {
  otpId: string;
  channel: 'sms' | 'email';
  destination: string;
  expiresAt: string;
  devCode?: string;
  deliveryMode?: string;
};

type ClientVerifyResponse = {
  sessionToken: string;
  profile: ClientLoginProfile;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'Request failed.');
  }
  return payload as T;
}

function todayInputValue() {
  const today = new Date();
  const offsetDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

export default function BookPage() {
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<BookingSuccess | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [clientLoginOpen, setClientLoginOpen] = useState(false);
  const [clientLoginStage, setClientLoginStage] = useState<LoginStage>('request');
  const [clientLoginPhone, setClientLoginPhone] = useState('');
  const [clientLoginEmail, setClientLoginEmail] = useState('');
  const [clientOtpCode, setClientOtpCode] = useState('');
  const [clientOtp, setClientOtp] = useState<ClientCodeResponse | null>(null);
  const [clientSessionToken, setClientSessionToken] = useState('');
  const [clientProfile, setClientProfile] = useState<ClientLoginProfile | null>(null);
  const [clientLoginLoading, setClientLoginLoading] = useState(false);
  const [clientLoginNotice, setClientLoginNotice] = useState('');
  const [step, setStep] = useState<FlowStep>(0);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [procedureId, setProcedureId] = useState('checkup');
  const [practitionerChoice, setPractitionerChoice] = useState(FIRST_AVAILABLE);
  const [selectedDate, setSelectedDate] = useState(todayInputValue);
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
  const canGoToTreatment = patientName.trim() && patientPhone.trim() && patientEmail.trim();
  const canGoToDiary = Boolean(activeProcedureId && practitionerChoice);
  const canConfirm = Boolean(selectedTime && selectedPractitionerId);
  const successCopyText = successBooking ? [
    'ZipBook appointment confirmed',
    `Booking ID: ${successBooking.id}`,
    `Patient: ${successBooking.patientName}`,
    `Phone: ${successBooking.patientPhone}`,
    `Email: ${successBooking.patientEmail}`,
    `Treatment: ${successBooking.treatment} (${successBooking.duration} mins)`,
    `Date: ${successBooking.dateLabel}`,
    `Time: ${successBooking.time}`,
    `Practitioner: ${successBooking.practitioner}`,
    successBooking.notes ? `Notes: ${successBooking.notes}` : ''
  ].filter(Boolean).join('\n') : '';

  useEffect(() => {
    if (practitionerChoice !== FIRST_AVAILABLE && !eligiblePractitioners.some((item) => item.id === practitionerChoice)) {
      setPractitionerChoice(FIRST_AVAILABLE);
    }
  }, [eligiblePractitioners, practitionerChoice]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem('zipbook-client-session') ?? '';
    if (!storedToken) return;

    setClientLoginLoading(true);
    fetch('/api/client-login/session', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${storedToken}` }
    })
      .then((response) => readJsonResponse<{ profile: ClientLoginProfile }>(response))
      .then((payload) => {
        setClientSessionToken(storedToken);
        setClientProfile(payload.profile);
        setClientLoginStage('signed-in');
      })
      .catch(() => {
        window.localStorage.removeItem('zipbook-client-session');
      })
      .finally(() => setClientLoginLoading(false));
  }, []);

  function resetSelection() {
    setSelectedTime('');
    setSelectedPractitionerId('');
  }

  function applyClientProfile(profile: ClientLoginProfile) {
    setClientProfile(profile);
    setClientLoginStage('signed-in');
    if (profile.customer.fullName && profile.customer.fullName !== 'Client user') setPatientName(profile.customer.fullName);
    if (profile.customer.phone && !profile.customer.phone.startsWith('no-phone-')) setPatientPhone(profile.customer.phone);
    if (profile.customer.email && !profile.customer.email.endsWith('@client-login.local')) setPatientEmail(profile.customer.email);
  }

  async function requestClientLoginCode() {
    setClientLoginLoading(true);
    setClientLoginNotice('');
    try {
      const response = await fetch('/api/client-login/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clientLoginPhone, email: clientLoginEmail })
      });
      const payload = await readJsonResponse<ClientCodeResponse>(response);
      setClientOtp(payload);
      setClientOtpCode('');
      setClientLoginStage('verify');
      setClientLoginNotice(`Code prepared for ${payload.destination}. Development code: ${payload.devCode ?? 'check delivery provider'}.`);
    } catch (error) {
      setClientLoginNotice(error instanceof Error ? error.message : 'Could not send the login code.');
    } finally {
      setClientLoginLoading(false);
    }
  }

  async function verifyClientLoginCode() {
    if (!clientOtp) return;
    setClientLoginLoading(true);
    setClientLoginNotice('');
    try {
      const response = await fetch('/api/client-login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId: clientOtp.otpId, code: clientOtpCode })
      });
      const payload = await readJsonResponse<ClientVerifyResponse>(response);
      window.localStorage.setItem('zipbook-client-session', payload.sessionToken);
      setClientSessionToken(payload.sessionToken);
      applyClientProfile(payload.profile);
      setClientLoginNotice('Signed in. Your appointment details are ready below.');
    } catch (error) {
      setClientLoginNotice(error instanceof Error ? error.message : 'Could not verify the login code.');
    } finally {
      setClientLoginLoading(false);
    }
  }

  function signOutClient() {
    window.localStorage.removeItem('zipbook-client-session');
    setClientSessionToken('');
    setClientProfile(null);
    setClientOtp(null);
    setClientOtpCode('');
    setClientLoginStage('request');
    setClientLoginNotice('Signed out on this device.');
  }

  async function copyBookingDetails() {
    if (!successCopyText) return;

    try {
      await navigator.clipboard.writeText(successCopyText);
      setCopyStatus('Copied');
      window.setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('Copy failed');
      window.setTimeout(() => setCopyStatus(''), 2500);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTime || !selectedPractitionerId) return;

    try {
      const newBooking = await createBooking({
        patientName,
        patientPhone,
        patientEmail,
        customerId: clientProfile?.customer.id,
        procedureId: activeProcedureId,
        practitionerId: selectedPractitionerId,
        date: selectedDate,
        time: selectedTime,
        source: 'client',
        notes
      });

      setConfirmedBookingId(newBooking.id);
      setSuccessBooking({
        id: newBooking.id,
        patientName,
        patientPhone,
        patientEmail,
        treatment: selectedProcedure?.name ?? 'Selected treatment',
        duration: procedureDuration(activeProcedureId, procedures),
        dateLabel: getDayLabel(selectedDate),
        time: selectedTime,
        practitioner: selectedPractitioner?.name ?? 'Selected practitioner',
        notes
      });
      setBookingOpen(false);
      setTimePickerOpen(false);
      setStep(0);
      resetSelection();
    } catch {
      // Error is surfaced by the hook in the page notice.
    }
  }

  return (
    <main className="shell fresh-shell">
      <Header area="client" />

      <section className="focus-hero">
        <div>
          <p className="badge blue-badge">Client booking app · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Book your dental appointment.</h1>
          <p className="hero-copy tight-copy">
            A simple step-by-step booking flow. Patients enter their details, choose the treatment, browse real available times, review a clear summary, then book a live appointment.
          </p>
          <div className="quick-summary">
            <span>Live diary</span>
            <span>Practitioner-aware</span>
            <span>Conflict protected</span>
          </div>
          <button className="button primary large-cta" type="button" onClick={() => setBookingOpen(true)}>
            Start booking
          </button>
          {confirmedBookingId && (
            <p className="notice success" role="status">Appointment booked and saved to the shared diary.</p>
          )}
          {error && (
            <div className="notice warning" role="alert">
              {error}
              <div style={{ marginTop: 10 }}><button className="pill" type="button" onClick={refresh}>Retry database connection</button></div>
            </div>
          )}
        </div>

        <div className="visual-card">
          <div className="phone-preview">
            <span className="phone-pill">Today’s flow</span>
            <strong>1. Details</strong>
            <strong>2. Treatment</strong>
            <strong>3. Diary slot</strong>
            <strong>4. Review & book</strong>
          </div>
        </div>
      </section>

      <section className="client-login-card" aria-label="Client OTP login">
        <div>
          <p className="badge blue-badge">Client login · OTP foundation</p>
          <h2>{clientProfile ? 'Signed in for quicker bookings.' : 'Sign in with a one-time code.'}</h2>
          <p className="mini-copy">
            {clientProfile
              ? 'Clients can see recent appointments and book again without retyping everything.'
              : 'Clients can still book as a guest. Login now prepares the phone/email one-time-code flow for the customer app only.'}
          </p>
        </div>
        <div className="client-login-actions">
          <button className="button primary" type="button" onClick={() => setClientLoginOpen((current) => !current)}>
            {clientLoginOpen ? 'Hide login' : clientProfile ? 'My bookings' : 'Client login'}
          </button>
          <button className="pill" type="button" onClick={() => setBookingOpen(true)}>{clientProfile ? 'Book another appointment' : 'Continue as guest'}</button>
        </div>
        {clientLoginOpen && (
          <div className="client-login-panel">
            {clientLoginStage !== 'signed-in' && (
              <>
                <div className="grid two controls-grid">
                  <div className="form-row">
                    <label htmlFor="clientLoginPhone">Mobile number</label>
                    <input id="clientLoginPhone" value={clientLoginPhone} onChange={(event) => setClientLoginPhone(event.target.value)} placeholder="+254..." />
                  </div>
                  <div className="form-row">
                    <label htmlFor="clientLoginEmail">Email backup</label>
                    <input id="clientLoginEmail" value={clientLoginEmail} onChange={(event) => setClientLoginEmail(event.target.value)} type="email" placeholder="you@example.com" />
                  </div>
                </div>
                {clientLoginStage === 'verify' && (
                  <div className="client-otp-box">
                    <div className="form-row">
                      <label htmlFor="clientOtpCode">Login code</label>
                      <input id="clientOtpCode" value={clientOtpCode} onChange={(event) => setClientOtpCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" />
                    </div>
                    {clientOtp?.devCode && <p className="dev-code-pill">Development code: <strong>{clientOtp.devCode}</strong></p>}
                  </div>
                )}
                <div className="client-login-bottom">
                  {clientLoginStage === 'request' ? (
                    <button className="button primary" type="button" onClick={requestClientLoginCode} disabled={clientLoginLoading || (!clientLoginPhone.trim() && !clientLoginEmail.trim())}>
                      {clientLoginLoading ? 'Preparing code…' : 'Send login code'}
                    </button>
                  ) : (
                    <>
                      <button className="button primary" type="button" onClick={verifyClientLoginCode} disabled={clientLoginLoading || clientOtpCode.trim().length < 4}>
                        {clientLoginLoading ? 'Checking code…' : 'Verify code'}
                      </button>
                      <button className="pill" type="button" onClick={requestClientLoginCode} disabled={clientLoginLoading}>Send again</button>
                    </>
                  )}
                  <span>{clientLoginStage === 'request' ? 'SMS/email delivery provider still to be connected.' : 'Codes expire after 10 minutes.'}</span>
                </div>
              </>
            )}

            {clientLoginStage === 'signed-in' && clientProfile && (
              <div className="client-profile-panel">
                <div className="client-profile-head">
                  <div>
                    <strong>{clientProfile.customer.fullName === 'Client user' ? 'Client account' : clientProfile.customer.fullName}</strong>
                    <span>{clientProfile.customer.phone} · {clientProfile.customer.email}</span>
                  </div>
                  <button className="pill" type="button" onClick={signOutClient}>Sign out</button>
                </div>
                <div className="client-booking-list">
                  {clientProfile.bookings.length ? clientProfile.bookings.map((booking) => (
                    <article className="client-booking-item" key={booking.id}>
                      <strong>{booking.treatment}</strong>
                      <span>{getDayLabel(booking.date)} · {booking.time}–{booking.endTime}</span>
                      <em>{booking.practitioner} · {booking.status}</em>
                    </article>
                  )) : <p className="mini-copy">No previous appointments found for this login yet.</p>}
                </div>
              </div>
            )}
            {clientLoginNotice && <p className={clientLoginNotice.toLowerCase().includes('could not') || clientLoginNotice.toLowerCase().includes('not correct') || clientLoginNotice.toLowerCase().includes('expired') ? 'notice warning' : 'notice success'} role="status">{clientLoginNotice}</p>}
          </div>
        )}
      </section>

      <section className="compact-dashboard">
        <article className="mini-card"><strong>{procedures.length}</strong><span>Treatments</span></article>
        <article className="mini-card"><strong>{eligiblePractitioners.length}</strong><span>Available clinicians</span></article>
        <article className="mini-card"><strong>{loading ? '…' : availableSlots.length}</strong><span>Slots for selected date</span></article>
      </section>

      <form className={`booking-workflow ${bookingOpen ? 'is-open' : ''}`} onSubmit={handleSubmit}>
        <div className="workflow-card">
          <div className="workflow-head">
            <div>
              <p className="badge blue-badge">Step {step + 1} of {steps.length}</p>
              <h2>{steps[step]}</h2>
            </div>
            <button className="icon-button mobile-close" type="button" aria-label="Close booking flow" onClick={() => { setBookingOpen(false); setTimePickerOpen(false); }}>×</button>
          </div>


          {step === 0 && (
            <section className="flow-step">
              <div className="form-row">
                <label htmlFor="patientName">Full name</label>
                <input id="patientName" value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Your full name" required />
              </div>
              <div className="form-row">
                <label htmlFor="patientPhone">Mobile number</label>
                <input id="patientPhone" value={patientPhone} onChange={(event) => setPatientPhone(event.target.value)} placeholder="+254..." required />
              </div>
              <div className="form-row">
                <label htmlFor="patientEmail">Email address</label>
                <input id="patientEmail" value={patientEmail} onChange={(event) => setPatientEmail(event.target.value)} type="email" placeholder="you@example.com" required />
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="flow-step">
              <div className="form-row">
                <label htmlFor="procedure">Treatment</label>
                <select id="procedure" value={activeProcedureId} onChange={(event) => { setProcedureId(event.target.value); resetSelection(); }}>
                  {procedures.map((procedure) => (
                    <option key={procedure.id} value={procedure.id}>{procedure.name} — {procedure.durationMinutes} mins</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="practitioner">Dentist / practitioner</label>
                <select id="practitioner" value={practitionerChoice} onChange={(event) => { setPractitionerChoice(event.target.value); resetSelection(); }}>
                  <option value={FIRST_AVAILABLE}>First available</option>
                  {eligiblePractitioners.map((practitioner) => (
                    <option key={practitioner.id} value={practitioner.id}>{practitioner.name} — {practitioner.role}</option>
                  ))}
                </select>
              </div>
              {selectedProcedure && (
                <p className="soft-note">{selectedProcedure.name} takes {procedureDuration(activeProcedureId, procedures)} minutes.</p>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="flow-step diary-choice-step">
              <div className="form-row">
                <label htmlFor="date">Diary date</label>
                <input id="date" type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); resetSelection(); }} required />
              </div>
              <div className="summary-strip">
                <strong>{loading ? 'Loading diary…' : getDayLabel(selectedDate)}</strong>
                <span>{availableSlots.length} Available Times</span>
              </div>
              {selectedTime ? (
                <div className="selected-slot-summary">
                  <span>Selected time</span>
                  <strong>{selectedTime} · {selectedPractitioner?.name ?? 'Practitioner selected'}</strong>
                </div>
              ) : (
                <p className="mini-copy">Choose a date, then open the time selector to view the full list of available appointment times.</p>
              )}
              <div className="diary-inline-actions">
                <button className="pill" type="button" onClick={() => setStep(1)} disabled={saving}>Back</button>
                <button className="button primary" type="button" onClick={() => setTimePickerOpen(true)} disabled={loading || saving}>
                  Select Time
                </button>
              </div>
            </section>
          )}

          {timePickerOpen && (
            <div className="time-picker-popup" role="dialog" aria-modal="true" aria-labelledby="time-picker-title">
              <div className="time-picker-card">
                <div className="workflow-head time-picker-head">
                  <div>
                    <p className="badge blue-badge">Available times</p>
                    <h2 id="time-picker-title">{getDayLabel(selectedDate)}</h2>
                    <p className="mini-copy">Select one slot. You will review the appointment before it is booked.</p>
                  </div>
                  <button className="icon-button mobile-close" type="button" aria-label="Close time selector" onClick={() => setTimePickerOpen(false)}>×</button>
                </div>

                <div className="time-picker-slots" role="list" aria-label="Available appointment times">
                  {slots.map((slot) => (
                    <button
                      key={`${slot.time}-${slot.endTime}-${slot.practitionerId ?? 'none'}`}
                      className={`slot ${slot.available ? 'available' : 'unavailable'} ${selectedTime === slot.time && selectedPractitionerId === slot.practitionerId ? 'selected' : ''}`}
                      disabled={!slot.available || saving}
                      type="button"
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

                <div className="time-picker-actions">
                  <button className="pill" type="button" onClick={() => setTimePickerOpen(false)}>Back</button>
                  <button
                    className="button primary"
                    type="button"
                    disabled={!canConfirm || saving}
                    onClick={() => { setTimePickerOpen(false); setStep(3); }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <section className="flow-step">
              <div className="confirmation-card">
                <h3>Review your appointment</h3>
                <p><strong>{patientName || 'Patient'}</strong></p>
                <p>{selectedProcedure?.name} · {procedureDuration(activeProcedureId, procedures)} mins</p>
                <p>{getDayLabel(selectedDate)} at {selectedTime || 'choose a time'}</p>
                <p>{selectedPractitioner ? selectedPractitioner.name : 'No practitioner selected yet'}</p>
              </div>
              <div className="form-row">
                <label htmlFor="notes">Notes for the practice</label>
                <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes or symptoms." />
              </div>
            </section>
          )}

          {step !== 2 && (
            <div className="workflow-actions">
              <button className="pill" type="button" disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(0, current - 1) as FlowStep)}>Back</button>
              {step < 3 ? (
                <button
                  className="button primary"
                  type="button"
                  disabled={(step === 0 && !canGoToTreatment) || (step === 1 && !canGoToDiary)}
                  onClick={() => setStep((current) => Math.min(3, current + 1) as FlowStep)}
                >
                  Continue
                </button>
              ) : (
                <button className="button primary" type="submit" disabled={!canConfirm || saving || Boolean(error)}>
                  {saving ? 'Checking diary…' : 'Book appointment'}
                </button>
              )}
            </div>
          )}
        </div>
      </form>


      {successBooking && (
        <section className="booking-success-page" aria-labelledby="booking-success-title" role="dialog" aria-modal="true">
          <div className="booking-success-card">
            <p className="badge blue-badge">Booking confirmed</p>
            <h2 id="booking-success-title">Appointment confirmed.</h2>
            <p className="mini-copy success-mini-copy">Your booking details are below. Use Copy to save or share them.</p>

            <div className="success-details-card">
              <div className="success-details-head">
                <strong>Booking details</strong>
                <button className="copy-details-button" type="button" onClick={copyBookingDetails} aria-label="Copy booking details">
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

            <div className="success-actions">
              <a className="button primary" href="/">Back to home</a>
              <button
                className="pill"
                type="button"
                onClick={() => {
                  setSuccessBooking(null);
                  window.close();
                }}
              >
                Cancel / close app
              </button>
            </div>
          </div>
        </section>
      )}

      <ClientInstallPrompt />

      <p className="footer-note">Client-facing installable app by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
