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


type PhoneCountry = {
  name: string;
  iso: string;
  dialCode: string;
};

const PHONE_COUNTRIES: PhoneCountry[] = [
  { name: 'Kenya', iso: 'KE', dialCode: '+254' },
  { name: 'United Kingdom', iso: 'GB', dialCode: '+44' },
  { name: 'South Africa', iso: 'ZA', dialCode: '+27' },
  { name: 'United States', iso: 'US', dialCode: '+1' },
  { name: 'Canada', iso: 'CA', dialCode: '+1' },
  { name: 'Ireland', iso: 'IE', dialCode: '+353' },
  { name: 'Australia', iso: 'AU', dialCode: '+61' },
  { name: 'New Zealand', iso: 'NZ', dialCode: '+64' },
  { name: 'United Arab Emirates', iso: 'AE', dialCode: '+971' },
  { name: 'Afghanistan', iso: 'AF', dialCode: '+93' },
  { name: 'Albania', iso: 'AL', dialCode: '+355' },
  { name: 'Algeria', iso: 'DZ', dialCode: '+213' },
  { name: 'Andorra', iso: 'AD', dialCode: '+376' },
  { name: 'Angola', iso: 'AO', dialCode: '+244' },
  { name: 'Argentina', iso: 'AR', dialCode: '+54' },
  { name: 'Austria', iso: 'AT', dialCode: '+43' },
  { name: 'Bahamas', iso: 'BS', dialCode: '+1' },
  { name: 'Bahrain', iso: 'BH', dialCode: '+973' },
  { name: 'Bangladesh', iso: 'BD', dialCode: '+880' },
  { name: 'Belgium', iso: 'BE', dialCode: '+32' },
  { name: 'Botswana', iso: 'BW', dialCode: '+267' },
  { name: 'Brazil', iso: 'BR', dialCode: '+55' },
  { name: 'Bulgaria', iso: 'BG', dialCode: '+359' },
  { name: 'Burundi', iso: 'BI', dialCode: '+257' },
  { name: 'Cameroon', iso: 'CM', dialCode: '+237' },
  { name: 'China', iso: 'CN', dialCode: '+86' },
  { name: 'Croatia', iso: 'HR', dialCode: '+385' },
  { name: 'Cyprus', iso: 'CY', dialCode: '+357' },
  { name: 'Czechia', iso: 'CZ', dialCode: '+420' },
  { name: 'Denmark', iso: 'DK', dialCode: '+45' },
  { name: 'Egypt', iso: 'EG', dialCode: '+20' },
  { name: 'Ethiopia', iso: 'ET', dialCode: '+251' },
  { name: 'Finland', iso: 'FI', dialCode: '+358' },
  { name: 'France', iso: 'FR', dialCode: '+33' },
  { name: 'Germany', iso: 'DE', dialCode: '+49' },
  { name: 'Ghana', iso: 'GH', dialCode: '+233' },
  { name: 'Greece', iso: 'GR', dialCode: '+30' },
  { name: 'Hong Kong', iso: 'HK', dialCode: '+852' },
  { name: 'India', iso: 'IN', dialCode: '+91' },
  { name: 'Indonesia', iso: 'ID', dialCode: '+62' },
  { name: 'Israel', iso: 'IL', dialCode: '+972' },
  { name: 'Italy', iso: 'IT', dialCode: '+39' },
  { name: 'Japan', iso: 'JP', dialCode: '+81' },
  { name: 'Kuwait', iso: 'KW', dialCode: '+965' },
  { name: 'Malawi', iso: 'MW', dialCode: '+265' },
  { name: 'Malaysia', iso: 'MY', dialCode: '+60' },
  { name: 'Mauritius', iso: 'MU', dialCode: '+230' },
  { name: 'Mexico', iso: 'MX', dialCode: '+52' },
  { name: 'Morocco', iso: 'MA', dialCode: '+212' },
  { name: 'Mozambique', iso: 'MZ', dialCode: '+258' },
  { name: 'Namibia', iso: 'NA', dialCode: '+264' },
  { name: 'Netherlands', iso: 'NL', dialCode: '+31' },
  { name: 'Nigeria', iso: 'NG', dialCode: '+234' },
  { name: 'Norway', iso: 'NO', dialCode: '+47' },
  { name: 'Oman', iso: 'OM', dialCode: '+968' },
  { name: 'Pakistan', iso: 'PK', dialCode: '+92' },
  { name: 'Philippines', iso: 'PH', dialCode: '+63' },
  { name: 'Poland', iso: 'PL', dialCode: '+48' },
  { name: 'Portugal', iso: 'PT', dialCode: '+351' },
  { name: 'Qatar', iso: 'QA', dialCode: '+974' },
  { name: 'Romania', iso: 'RO', dialCode: '+40' },
  { name: 'Rwanda', iso: 'RW', dialCode: '+250' },
  { name: 'Saudi Arabia', iso: 'SA', dialCode: '+966' },
  { name: 'Singapore', iso: 'SG', dialCode: '+65' },
  { name: 'Spain', iso: 'ES', dialCode: '+34' },
  { name: 'Sweden', iso: 'SE', dialCode: '+46' },
  { name: 'Switzerland', iso: 'CH', dialCode: '+41' },
  { name: 'Tanzania', iso: 'TZ', dialCode: '+255' },
  { name: 'Thailand', iso: 'TH', dialCode: '+66' },
  { name: 'Turkey', iso: 'TR', dialCode: '+90' },
  { name: 'Uganda', iso: 'UG', dialCode: '+256' },
  { name: 'Zambia', iso: 'ZM', dialCode: '+260' },
  { name: 'Zimbabwe', iso: 'ZW', dialCode: '+263' }
];

const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

function phoneCountryLabel(country: PhoneCountry) {
  return `${country.name} (${country.dialCode})`;
}

function findPhoneCountry(value: string) {
  const clean = value.trim().toLowerCase();
  return PHONE_COUNTRIES.find((country) =>
    phoneCountryLabel(country).toLowerCase() === clean
    || country.name.toLowerCase() === clean
    || country.iso.toLowerCase() === clean
    || country.dialCode === value.trim()
  ) ?? null;
}

function buildInternationalPhone(country: PhoneCountry | null, localValue: string) {
  const trimmed = localValue.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('+')) {
    return `+${trimmed.replace(/\D/g, '')}`;
  }

  if (!country) return '';

  let digits = trimmed.replace(/\D/g, '');
  const countryDigits = country.dialCode.replace(/\D/g, '');
  if (digits.startsWith(countryDigits)) {
    return `+${digits}`;
  }

  digits = digits.replace(/^0+/, '');
  return `${country.dialCode}${digits}`;
}

function previewPhone(country: PhoneCountry | null, localValue: string) {
  const full = buildInternationalPhone(country, localValue);
  return full || 'Select country and enter local number';
}

type LoginStage = 'login' | 'signup' | 'verify-signup' | 'signed-in';

type ClientCodeResponse = {
  otpId: string;
  channel: 'sms' | 'email';
  destination: string;
  accountPhone?: string;
  expiresAt: string;
  deliveryMessage?: string;
  deliveryMode?: string;
  deliveryProvider?: string;
  deliveryReady?: boolean;
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
  const [clientLoginStage, setClientLoginStage] = useState<LoginStage>('login');
  const [clientLoginCountryInput, setClientLoginCountryInput] = useState(phoneCountryLabel(DEFAULT_PHONE_COUNTRY));
  const [clientLoginPhone, setClientLoginPhone] = useState('');
  const [clientLoginEmail, setClientLoginEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
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
  const selectedLoginCountry = findPhoneCountry(clientLoginCountryInput);
  const clientLoginFullPhone = buildInternationalPhone(selectedLoginCountry, clientLoginPhone);
  const canSignInClient = Boolean(selectedLoginCountry && clientLoginFullPhone && clientPassword.trim());
  const canStartClientSignup = Boolean(selectedLoginCountry && clientLoginFullPhone && clientLoginEmail.trim() && clientPassword.length >= 6);
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

  async function requestClientSignupCode() {
    setClientLoginLoading(true);
    setClientLoginNotice('');
    try {
      const response = await fetch('/api/client-login/sign-up/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: clientLoginFullPhone,
          localPhone: clientLoginPhone,
          countryName: selectedLoginCountry?.name,
          countryIso: selectedLoginCountry?.iso,
          countryDialCode: selectedLoginCountry?.dialCode,
          email: clientLoginEmail,
          password: clientPassword
        })
      });
      const payload = await readJsonResponse<ClientCodeResponse>(response);
      setClientOtp(payload);
      setClientOtpCode('');
      setClientLoginStage('verify-signup');
      setClientLoginNotice(payload.deliveryMessage ?? `We have sent a sign-up code to ${payload.destination}.`);
    } catch (error) {
      setClientLoginNotice(error instanceof Error ? error.message : 'Could not send the sign-up code.');
    } finally {
      setClientLoginLoading(false);
    }
  }

  async function verifyClientSignupCode() {
    if (!clientOtp) return;
    setClientLoginLoading(true);
    setClientLoginNotice('');
    try {
      const response = await fetch('/api/client-login/sign-up/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId: clientOtp.otpId, code: clientOtpCode })
      });
      const payload = await readJsonResponse<ClientVerifyResponse>(response);
      window.localStorage.setItem('zipbook-client-session', payload.sessionToken);
      setClientSessionToken(payload.sessionToken);
      applyClientProfile(payload.profile);
      setClientLoginNotice('Signed up and signed in. You can now book more quickly next time.');
    } catch (error) {
      setClientLoginNotice(error instanceof Error ? error.message : 'Could not verify the sign-up code.');
    } finally {
      setClientLoginLoading(false);
    }
  }

  async function signInClient() {
    setClientLoginLoading(true);
    setClientLoginNotice('');
    try {
      const response = await fetch('/api/client-login/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: clientLoginFullPhone,
          localPhone: clientLoginPhone,
          countryName: selectedLoginCountry?.name,
          countryIso: selectedLoginCountry?.iso,
          countryDialCode: selectedLoginCountry?.dialCode,
          password: clientPassword
        })
      });
      const payload = await readJsonResponse<ClientVerifyResponse>(response);
      window.localStorage.setItem('zipbook-client-session', payload.sessionToken);
      setClientSessionToken(payload.sessionToken);
      applyClientProfile(payload.profile);
      setClientLoginNotice('Signed in.');
    } catch (error) {
      setClientLoginNotice(error instanceof Error ? error.message : 'Could not sign in.');
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
    setClientLoginStage('login');
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

      <section className="focus-hero client-welcome-hero">
        <div>
          <p className="badge blue-badge">ZipBook · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Book your appointment.</h1>
          <p className="hero-copy tight-copy">
            Sign in for quicker booking, sign up once to verify your mobile number, or book an appointment now.
          </p>
          <div className="client-primary-actions">
            <button className="button primary large-cta" type="button" onClick={() => { setClientLoginOpen(true); setClientLoginStage(clientProfile ? 'signed-in' : 'login'); }}>
              {clientProfile ? 'My account' : 'Login / Sign up'}
            </button>
            <button className="button orange large-cta" type="button" onClick={() => setBookingOpen(true)}>
              Book appointment
            </button>
          </div>
          {confirmedBookingId && (
            <p className="notice success" role="status">Appointment booked.</p>
          )}
          {error && (
            <div className="notice warning" role="alert">
              {error}
              <div style={{ marginTop: 10 }}><button className="pill" type="button" onClick={refresh}>Retry connection</button></div>
            </div>
          )}
        </div>
      </section>

      <section className="client-login-card simplified-client-login" aria-label="Client login and sign up">
        <div>
          <h2>{clientProfile ? 'You are signed in.' : 'Login or sign up'}</h2>
          <p className="mini-copy">
            {clientProfile
              ? 'Your details are ready for quicker appointment booking.'
              : 'Existing clients sign in with mobile number and password. New clients verify their mobile number once during sign-up.'}
          </p>
        </div>
        <div className="client-login-actions">
          <button className="button primary" type="button" onClick={() => setClientLoginOpen((current) => !current)}>
            {clientLoginOpen ? 'Hide' : clientProfile ? 'My account' : 'Login / Sign up'}
          </button>
          <button className="pill" type="button" onClick={() => setBookingOpen(true)}>Book appointment</button>
        </div>
        {clientLoginOpen && (
          <div className="client-login-panel">
            {clientLoginStage !== 'signed-in' && (
              <>
                <div className="auth-tabs" role="tablist" aria-label="Client account options">
                  <button className={clientLoginStage === 'login' ? 'auth-tab active' : 'auth-tab'} type="button" onClick={() => { setClientLoginStage('login'); setClientLoginNotice(''); }}>
                    Login
                  </button>
                  <button className={clientLoginStage === 'signup' || clientLoginStage === 'verify-signup' ? 'auth-tab active' : 'auth-tab'} type="button" onClick={() => { setClientLoginStage('signup'); setClientLoginNotice(''); }}>
                    Sign up
                  </button>
                </div>

                {clientLoginStage !== 'verify-signup' && (
                  <div className="grid two controls-grid">
                    <div className="form-row">
                      <label htmlFor="clientLoginCountry">Country</label>
                      <input
                        id="clientLoginCountry"
                        list="zipbook-country-options"
                        value={clientLoginCountryInput}
                        onChange={(event) => setClientLoginCountryInput(event.target.value)}
                        autoComplete="country-name"
                        placeholder="Search country"
                      />
                      <datalist id="zipbook-country-options">
                        {PHONE_COUNTRIES.map((country) => <option key={`${country.iso}-${country.dialCode}`} value={phoneCountryLabel(country)} />)}
                      </datalist>
                    </div>
                    <div className="form-row">
                      <label htmlFor="clientLoginPhone">Mobile number</label>
                      <input id="clientLoginPhone" value={clientLoginPhone} onChange={(event) => setClientLoginPhone(event.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="0712345678" />
                      <small>{previewPhone(selectedLoginCountry, clientLoginPhone)}</small>
                    </div>
                    {clientLoginStage === 'signup' && (
                      <div className="form-row full-width-row">
                        <label htmlFor="clientLoginEmail">Email address</label>
                        <input id="clientLoginEmail" value={clientLoginEmail} onChange={(event) => setClientLoginEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" />
                      </div>
                    )}
                    <div className="form-row full-width-row">
                      <label htmlFor="clientPassword">Password</label>
                      <input id="clientPassword" value={clientPassword} onChange={(event) => setClientPassword(event.target.value)} type="password" autoComplete={clientLoginStage === 'signup' ? 'new-password' : 'current-password'} placeholder="Password" />
                      {clientLoginStage === 'signup' && <small>Use at least 6 characters. OTP is used once to verify the mobile number.</small>}
                    </div>
                  </div>
                )}

                {clientLoginStage === 'verify-signup' && (
                  <div className="client-otp-box">
                    <p className="mini-copy">Enter the code sent to {clientOtp?.destination}. This verifies the mobile number for the new account.</p>
                    <div className="form-row">
                      <label htmlFor="clientOtpCode">Sign-up code</label>
                      <input id="clientOtpCode" value={clientOtpCode} onChange={(event) => setClientOtpCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" />
                    </div>
                    {clientOtp?.deliveryMode === 'server-console-preview' && <p className="delivery-note-pill">Local testing without email settings: check the Netlify dev terminal for the sign-up code.</p>}
                  </div>
                )}

                <div className="client-login-bottom">
                  {clientLoginStage === 'login' && (
                    <button className="button primary" type="button" onClick={signInClient} disabled={clientLoginLoading || !canSignInClient}>
                      {clientLoginLoading ? 'Signing in…' : 'Login'}
                    </button>
                  )}
                  {clientLoginStage === 'signup' && (
                    <button className="button primary" type="button" onClick={requestClientSignupCode} disabled={clientLoginLoading || !canStartClientSignup}>
                      {clientLoginLoading ? 'Sending code…' : 'Create account'}
                    </button>
                  )}
                  {clientLoginStage === 'verify-signup' && (
                    <>
                      <button className="button primary" type="button" onClick={verifyClientSignupCode} disabled={clientLoginLoading || clientOtpCode.trim().length < 4}>
                        {clientLoginLoading ? 'Checking code…' : 'Verify and sign in'}
                      </button>
                      <button className="pill" type="button" onClick={requestClientSignupCode} disabled={clientLoginLoading}>Send again</button>
                    </>
                  )}
                  <span>{clientLoginStage === 'login' ? 'No code needed for normal login.' : clientLoginStage === 'signup' ? 'We verify your mobile once when you sign up.' : 'Codes expire after 10 minutes.'}</span>
                </div>
              </>
            )}

            {clientLoginStage === 'signed-in' && clientProfile && (
              <div className="client-profile-panel">
                <div className="client-profile-head">
                  <div>
                    <strong>{clientProfile.customer.fullName === 'Client user' ? 'Client account' : clientProfile.customer.fullName}</strong>
                    <span>{clientProfile.customer.phone}</span>
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
                  )) : <p className="mini-copy">No previous appointments found yet.</p>}
                </div>
              </div>
            )}
            {clientLoginNotice && <p className={clientLoginNotice.toLowerCase().includes('could not') || clientLoginNotice.toLowerCase().includes('not correct') || clientLoginNotice.toLowerCase().includes('expired') || clientLoginNotice.toLowerCase().includes('not recognised') ? 'notice warning' : 'notice success'} role="status">{clientLoginNotice}</p>}
          </div>
        )}
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
                <input id="patientPhone" value={patientPhone} onChange={(event) => setPatientPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="+254712345678" required />
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
