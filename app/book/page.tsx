'use client';

import { DatePickerField } from '@/components/DatePickerField';
import { ZipSelect } from '@/components/ZipSelect';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { APP_VERSION, procedureDuration, type ClientLoginBooking, type ClientLoginProfile } from '@/lib/mockData';
import { FIRST_AVAILABLE, getAvailabilityForDate, getDateOffset, getDayLabel, practitionersForProcedure } from '@/lib/availability';
import { useBookingDatabase } from '@/lib/useBookingDatabase';
import { ClientInstallPrompt } from './ClientInstallPrompt';

const steps = ['Details', 'Treatment', 'Diary', 'Review'];

type FlowStep = 0 | 1 | 2 | 3;

type BookingSuccess = {
  kind: 'created' | 'updated';
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


function localToday(date = new Date()) {
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return local.toISOString().slice(0, 10);
}

function currentMinutes(date: Date) {
  return (date.getHours() * 60) + date.getMinutes();
}

function slotHasPassed(selectedDate: string, startTime: string, now: Date) {
  return selectedDate === localToday(now) && timeToMinutes(startTime) <= currentMinutes(now);
}

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

type LoginStage = 'login' | 'signup' | 'verify-signup' | 'forgot-password' | 'reset-password' | 'signed-in';

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
  testOtpCode?: string;
};

type ClientVerifyResponse = {
  sessionToken: string;
  profile: ClientLoginProfile;
};

type PushPublicKeyResponse = {
  configured: boolean;
  publicKey: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function phonePushDevice() {
  if (typeof navigator === 'undefined') return false;
  const agent = navigator.userAgent.toLowerCase();
  return agent.includes('iphone') || agent.includes('ipod') || agent.includes('windows phone') || (agent.includes('android') && agent.includes('mobile'));
}

function browserPushSupported() {
  return phonePushDevice()
    && typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

async function getPushPublicKey() {
  const response = await fetch('/api/push/public-key', { cache: 'no-store' });
  return readJsonResponse<PushPublicKeyResponse>(response);
}

async function getCurrentPushSubscription() {
  if (!browserPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

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
  const [editingClientBookingId, setEditingClientBookingId] = useState<string | null>(null);
  const [clientBookingActionKey, setClientBookingActionKey] = useState('');
  const [clientBookingNotice, setClientBookingNotice] = useState('');
  const [clientLoginOpen, setClientLoginOpen] = useState(false);
  const [clientPasswordResetOpen, setClientPasswordResetOpen] = useState(false);
  const modalHistoryRef = useRef(false);
  const [clientLoginStage, setClientLoginStage] = useState<LoginStage>('login');
  const [clientLoginCountryInput, setClientLoginCountryInput] = useState(phoneCountryLabel(DEFAULT_PHONE_COUNTRY));
  const [clientLoginPhone, setClientLoginPhone] = useState('');
  const [clientLoginEmail, setClientLoginEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientResetPassword, setClientResetPassword] = useState('');
  const [clientOtpCode, setClientOtpCode] = useState('');
  const [clientOtp, setClientOtp] = useState<ClientCodeResponse | null>(null);
  const [clientSessionToken, setClientSessionToken] = useState('');
  const [clientProfile, setClientProfile] = useState<ClientLoginProfile | null>(null);
  const [clientLoginLoading, setClientLoginLoading] = useState(false);
  const [clientLoginNotice, setClientLoginNotice] = useState('');
  const [pushSupported, setPushSupported] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNotice, setPushNotice] = useState('');
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
  const [now, setNow] = useState(() => new Date());
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
  const availabilityBookings = useMemo(() => editingClientBookingId ? bookings.filter((booking) => booking.id !== editingClientBookingId) : bookings, [bookings, editingClientBookingId]);
  const slots = useMemo(
    () => getAvailabilityForDate(availabilityBookings, selectedDate, activeProcedureId, context, practitionerChoice),
    [availabilityBookings, selectedDate, activeProcedureId, context, practitionerChoice]
  );
  const availableSlots = slots.filter((slot) => slot.available && !slotHasPassed(selectedDate, slot.time, now));
  const selectedSlot = slots.find((slot) => slot.time === selectedTime && slot.practitionerId === selectedPractitionerId);
  const selectedPractitioner = practitioners.find((item) => item.id === selectedPractitionerId);
  const selectedLoginCountry = findPhoneCountry(clientLoginCountryInput);
  const clientLoginFullPhone = buildInternationalPhone(selectedLoginCountry, clientLoginPhone);
  const canSignInClient = Boolean(selectedLoginCountry && clientLoginFullPhone && clientPassword.trim());
  const canStartClientSignup = Boolean(selectedLoginCountry && clientLoginFullPhone && clientLoginEmail.trim() && clientPassword.length >= 6);
  const canRequestPasswordReset = Boolean(selectedLoginCountry && clientLoginFullPhone && clientLoginEmail.trim());
  const canCompletePasswordReset = Boolean(clientOtpCode.trim().length >= 4 && clientResetPassword.length >= 6);
  const canGoToTreatment = patientName.trim() && patientPhone.trim() && patientEmail.trim();
  const canGoToDiary = Boolean(activeProcedureId && practitionerChoice);
  const selectedSlotHasPassed = selectedSlot ? slotHasPassed(selectedDate, selectedSlot.endTime, now) : false;
  const canConfirm = Boolean(selectedTime && selectedPractitionerId && !selectedSlotHasPassed);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
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
        applyClientProfile(payload.profile);
      })
      .catch(() => {
        window.localStorage.removeItem('zipbook-client-session');
      })
      .finally(() => setClientLoginLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkPushReadiness() {
      const supported = browserPushSupported();
      if (cancelled) return;
      setPushSupported(supported);
      setPushSubscribed(false);
      setPushNotice('');

      if (!supported || !clientSessionToken) return;

      try {
        const keyStatus = await getPushPublicKey();
        if (cancelled) return;
        setPushConfigured(Boolean(keyStatus.configured && keyStatus.publicKey));

        const subscription = await getCurrentPushSubscription();
        if (cancelled) return;
        setPushSubscribed(Boolean(subscription));

        if (subscription) {
          await fetch('/api/client-login/push-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${clientSessionToken}`
            },
            body: JSON.stringify({ subscription: subscription.toJSON() })
          }).catch(() => undefined);
        }
      } catch {
        if (!cancelled) setPushConfigured(false);
      }
    }

    void checkPushReadiness();
    return () => { cancelled = true; };
  }, [clientSessionToken]);

  function resetSelection() {
    setSelectedTime('');
    setSelectedPractitionerId('');
  }

  function prefillBookingDetailsFromProfile(profile: ClientLoginProfile) {
    if (profile.customer.fullName && profile.customer.fullName !== 'Client user') setPatientName(profile.customer.fullName);
    if (profile.customer.phone && !profile.customer.phone.startsWith('no-phone-')) setPatientPhone(profile.customer.phone);
    if (profile.customer.email && !profile.customer.email.endsWith('@client-login.local')) setPatientEmail(profile.customer.email);
  }

  function applyClientProfile(profile: ClientLoginProfile) {
    setClientProfile(profile);
    setClientLoginStage('signed-in');
    prefillBookingDetailsFromProfile(profile);
  }

  async function refreshClientProfileFromSession(token = clientSessionToken) {
    if (!token) return null;

    const response = await fetch('/api/client-login/session', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await readJsonResponse<{ profile: ClientLoginProfile }>(response);
    applyClientProfile(payload.profile);
    return payload.profile;
  }

  async function returnToClientAppAfterBooking() {
    setSuccessBooking(null);
    setCopyStatus('');
    modalHistoryRef.current = false;
    if (clientSessionToken) {
      try {
        await refreshClientProfileFromSession(clientSessionToken);
      } catch {
        // Booking is already confirmed; stale profile refresh should not block returning to the app.
      }
    }
    await refresh();
  }

  function hasOpenClientModal() {
    return bookingOpen || timePickerOpen || clientLoginOpen || clientPasswordResetOpen || Boolean(successBooking);
  }

  function closeTopClientModal() {
    if (timePickerOpen) {
      setTimePickerOpen(false);
      return;
    }
    if (successBooking) {
      setSuccessBooking(null);
      setCopyStatus('');
      return;
    }
    if (clientPasswordResetOpen) {
      setClientPasswordResetOpen(false);
      if (clientLoginStage === 'forgot-password' || clientLoginStage === 'reset-password') setClientLoginStage('login');
      return;
    }
    if (clientLoginOpen) {
      setClientLoginOpen(false);
      return;
    }
    if (bookingOpen) {
      setTimePickerOpen(false);
      setBookingOpen(false);
      setEditingClientBookingId(null);
    }
  }

  function pushClientModalHistory() {
    if (typeof window === 'undefined' || modalHistoryRef.current) return;
    window.history.pushState({ zipbookClientModal: true }, '', window.location.href);
    modalHistoryRef.current = true;
  }

  function dismissClientModal() {
    if (typeof window !== 'undefined' && modalHistoryRef.current) {
      window.history.back();
      return;
    }
    closeTopClientModal();
  }

  function openBookingFlow() {
    pushClientModalHistory();
    setEditingClientBookingId(null);
    setClientBookingNotice('');
    if (clientProfile) prefillBookingDetailsFromProfile(clientProfile);
    setStep(0);
    setTimePickerOpen(false);
    setBookingOpen(true);
  }

  function openEditClientBooking(booking: ClientLoginBooking) {
    if (!clientProfile) return;
    pushClientModalHistory();
    setEditingClientBookingId(booking.id);
    setClientBookingNotice('');
    setPatientName(clientProfile.customer.fullName === 'Client user' ? patientName : clientProfile.customer.fullName);
    setPatientPhone(clientProfile.customer.phone);
    setPatientEmail(clientProfile.customer.email);
    setProcedureId(booking.procedureId);
    setPractitionerChoice(booking.practitionerId);
    setSelectedPractitionerId(booking.practitionerId);
    setSelectedDate(booking.date);
    setSelectedTime(booking.time);
    setNotes(booking.notes ?? '');
    setStep(1);
    setTimePickerOpen(false);
    setClientLoginOpen(false);
    setBookingOpen(true);
  }

  function openClientLogin(stage: LoginStage) {
    pushClientModalHistory();
    setClientPasswordResetOpen(false);
    setClientLoginStage(stage);
    setClientLoginOpen(true);
  }

  function openClientPasswordReset() {
    pushClientModalHistory();
    setClientLoginOpen(false);
    setClientPasswordResetOpen(true);
    setClientLoginStage('forgot-password');
    setClientLoginNotice('');
    setClientOtp(null);
    setClientOtpCode('');
    setClientResetPassword('');
  }

  function backToClientLoginFromReset() {
    setClientPasswordResetOpen(false);
    setClientLoginOpen(true);
    setClientLoginStage('login');
    setClientLoginNotice('');
    setClientOtp(null);
    setClientOtpCode('');
    setClientResetPassword('');
  }

  function openTimePicker() {
    pushClientModalHistory();
    setTimePickerOpen(true);
  }

  async function activateClientPushNotifications() {
    if (!clientSessionToken) {
      setPushNotice('Please sign in before activating push notifications.');
      return;
    }

    if (!browserPushSupported()) {
      setPushSupported(false);
      setPushNotice('Push notifications are not supported on this browser/device.');
      return;
    }

    setPushBusy(true);
    setPushNotice('');

    try {
      const keyStatus = await getPushPublicKey();
      setPushConfigured(Boolean(keyStatus.configured && keyStatus.publicKey));
      if (!keyStatus.configured || !keyStatus.publicKey) {
        setPushNotice('Push notifications are not configured yet. Add the VAPID keys in Netlify first.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushNotice('Notifications were not allowed on this device.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyStatus.publicKey) as BufferSource
      });

      const response = await fetch('/api/client-login/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientSessionToken}`
        },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });
      await readJsonResponse<{ ok: boolean }>(response);
      setPushSubscribed(true);
      setPushNotice('Push notifications are active on this device.');
    } catch (error) {
      setPushNotice(error instanceof Error ? error.message : 'Could not activate push notifications.');
    } finally {
      setPushBusy(false);
    }
  }

  async function disableClientPushNotifications() {
    if (!clientSessionToken) return;
    setPushBusy(true);
    setPushNotice('');

    try {
      const subscription = await getCurrentPushSubscription();
      await fetch('/api/client-login/push-subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientSessionToken}`
        },
        body: JSON.stringify({ endpoint: subscription?.endpoint ?? '' })
      }).catch(() => undefined);
      await subscription?.unsubscribe().catch(() => false);
      setPushSubscribed(false);
      setPushNotice('Push notifications are off on this device.');
    } catch (error) {
      setPushNotice(error instanceof Error ? error.message : 'Could not turn off push notifications.');
    } finally {
      setPushBusy(false);
    }
  }

  useEffect(() => {
    function handleBrowserBack() {
      if (!hasOpenClientModal()) return;
      closeTopClientModal();
      modalHistoryRef.current = false;
    }

    window.addEventListener('popstate', handleBrowserBack);
    return () => window.removeEventListener('popstate', handleBrowserBack);
  }, [bookingOpen, timePickerOpen, clientLoginOpen, clientPasswordResetOpen, successBooking]);

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

  async function requestClientPasswordResetCode() {
    setClientLoginLoading(true);
    setClientLoginNotice('');
    try {
      const response = await fetch('/api/client-login/password-reset/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: clientLoginFullPhone,
          localPhone: clientLoginPhone,
          countryName: selectedLoginCountry?.name,
          countryIso: selectedLoginCountry?.iso,
          countryDialCode: selectedLoginCountry?.dialCode,
          email: clientLoginEmail
        })
      });
      const payload = await readJsonResponse<ClientCodeResponse>(response);
      setClientOtp(payload);
      setClientOtpCode('');
      setClientResetPassword('');
      setClientLoginStage('reset-password');
      setClientPasswordResetOpen(true);
      setClientLoginOpen(false);
      setClientLoginNotice(payload.deliveryMessage ?? `We have sent a password reset code to ${payload.destination}.`);
    } catch (error) {
      setClientLoginNotice(error instanceof Error ? error.message : 'Could not send the password reset code.');
    } finally {
      setClientLoginLoading(false);
    }
  }

  async function confirmClientPasswordReset() {
    if (!clientOtp) return;
    setClientLoginLoading(true);
    setClientLoginNotice('');
    try {
      const response = await fetch('/api/client-login/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId: clientOtp.otpId, code: clientOtpCode, password: clientResetPassword })
      });
      const payload = await readJsonResponse<ClientVerifyResponse>(response);
      window.localStorage.setItem('zipbook-client-session', payload.sessionToken);
      setClientSessionToken(payload.sessionToken);
      setClientPassword('');
      setClientResetPassword('');
      setClientPasswordResetOpen(false);
      setClientLoginOpen(true);
      applyClientProfile(payload.profile);
      setClientLoginNotice('Password reset. You are signed in again.');
    } catch (error) {
      setClientLoginNotice(error instanceof Error ? error.message : 'Could not reset the password.');
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
    setClientResetPassword('');
    setClientLoginStage('login');
    setPushSubscribed(false);
    setPushNotice('');
    setClientLoginNotice('Signed out on this device.');
  }

  async function deleteClientBooking(booking: ClientLoginBooking) {
    if (!clientSessionToken) {
      setClientBookingNotice('Please sign in before deleting a booking.');
      return;
    }

    const confirmed = window.confirm(`Delete booking for ${booking.treatment} on ${getDayLabel(booking.date)} at ${booking.time}?`);
    if (!confirmed) return;

    setClientBookingActionKey(`${booking.id}-delete`);
    setClientBookingNotice('');
    try {
      const response = await fetch(`/api/client-login/bookings/${encodeURIComponent(booking.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${clientSessionToken}` }
      });
      const payload = await readJsonResponse<{ profile: ClientLoginProfile }>(response);
      applyClientProfile(payload.profile);
      await refresh();
      setClientBookingNotice('Booking deleted. The practice diary has been updated.');
    } catch (error) {
      setClientBookingNotice(error instanceof Error ? error.message : 'Could not delete booking.');
    } finally {
      setClientBookingActionKey('');
    }
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
      let bookingId = editingClientBookingId ?? '';
      if (editingClientBookingId) {
        if (!clientSessionToken) throw new Error('Please sign in before editing a booking.');
        const response = await fetch(`/api/client-login/bookings/${encodeURIComponent(editingClientBookingId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientSessionToken}` },
          body: JSON.stringify({
            patientName,
            patientPhone,
            patientEmail,
            procedureId: activeProcedureId,
            practitionerId: selectedPractitionerId,
            date: selectedDate,
            time: selectedTime,
            notes
          })
        });
        const payload = await readJsonResponse<{ booking: { id: string }; profile: ClientLoginProfile }>(response);
        bookingId = payload.booking.id;
        applyClientProfile(payload.profile);
        await refresh();
      } else {
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
        bookingId = newBooking.id;

        if (clientSessionToken) {
          try {
            await refreshClientProfileFromSession(clientSessionToken);
          } catch {
            // Keep the confirmed booking flow moving even if the profile refresh is delayed.
          }
        }
      }

      setConfirmedBookingId(bookingId);
      setSuccessBooking({
        kind: editingClientBookingId ? 'updated' : 'created',
        id: bookingId,
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
      setEditingClientBookingId(null);
      modalHistoryRef.current = Boolean(typeof window !== 'undefined' && window.history.state?.zipbookClientModal);
      setStep(0);
      resetSelection();
    } catch (error) {
      setClientBookingNotice(error instanceof Error ? error.message : 'Could not save booking changes.');
    }
  }

  return (
    <main className="shell fresh-shell">
      <header className="client-home-topbar" aria-label="Client app header">
        <a className="client-home-brand" href="/book" aria-label="ZipBook client home">
          <img src="/icons/icon-72.png" alt="" width="44" height="44" />
          <span>ZipBook</span>
        </a>
        <button
          className="client-login-icon-button"
          type="button"
          aria-label={clientProfile ? 'Open my account' : 'Open login and sign up'}
          onClick={() => openClientLogin(clientProfile ? 'signed-in' : 'login')}
        >
          <span aria-hidden="true">{clientProfile ? '✓' : '👤'}</span>
          <strong>{clientProfile ? 'My account' : 'Login'}</strong>
        </button>
      </header>

      <section className="client-home-welcome" aria-labelledby="client-home-title">
        <div className="client-home-icon-wrap" aria-hidden="true">
          <img src="/icons/icon-192.png" alt="" width="96" height="96" />
        </div>
        <p className="badge blue-badge">ZipBook · {APP_VERSION}</p>
        <h1 id="client-home-title" className="hero-title clean-title">Welcome to ZipBook.</h1>
        <p className="hero-copy tight-copy">
          Book your appointment quickly and clearly, with your details ready when you sign in.
        </p>
        <div className="client-home-actions">
          <button className="button green large-cta" type="button" onClick={openBookingFlow}>
            Make a booking
          </button>
        </div>
        {clientProfile && (
          <p className="client-signed-in-note" role="status">
            Signed in as <strong>{clientProfile.customer.fullName === 'Client user' ? clientProfile.customer.phone : clientProfile.customer.fullName}</strong>
          </p>
        )}
        {confirmedBookingId && (
          <p className="notice success" role="status">Appointment booked.</p>
        )}
        {!bookingOpen && error && (
          <div className="notice warning" role="alert">
            {error}
            <div style={{ marginTop: 10 }}><button className="pill" type="button" onClick={refresh}>Retry connection</button></div>
          </div>
        )}
      </section>

      {clientLoginOpen && (
        <section className="client-auth-popup" aria-label="Client login and sign up" role="dialog" aria-modal="true">
          <div className="client-auth-card">
            <div className="client-auth-head">
              <div className="client-auth-title-copy">
                <p className="badge blue-badge">Client account</p>
                <h2>{clientProfile ? 'My account' : 'Login or sign up'}</h2>
                <p className="mini-copy">
                  {clientProfile
                    ? 'Your saved details are ready for quicker booking.'
                    : 'Login with your mobile number and password, or sign up once with email verification.'}
                </p>
              </div>
              <div className={clientLoginNotice.toLowerCase().includes('could not') || clientLoginNotice.toLowerCase().includes('not correct') || clientLoginNotice.toLowerCase().includes('expired') || clientLoginNotice.toLowerCase().includes('not recognised') ? 'client-auth-status-pill warning' : 'client-auth-status-pill'} role="status">
                <strong>{clientProfile ? 'Signed in' : 'Signed out'}</strong>
                <span>{clientLoginNotice || (clientProfile ? (clientProfile.customer.fullName === 'Client user' ? clientProfile.customer.phone : clientProfile.customer.fullName) : 'Login or create account')}</span>
              </div>
              <button className="icon-button mobile-close" type="button" aria-label="Close login" onClick={dismissClientModal}>×</button>
            </div>

            {clientLoginStage !== 'signed-in' && (
              <>
                <div className="auth-tabs" role="tablist" aria-label="Client account options">
                  <button className={clientLoginStage === 'login' ? 'auth-tab active' : 'auth-tab'} type="button" onClick={() => { setClientLoginStage('login'); setClientLoginNotice(''); setClientOtp(null); setClientOtpCode(''); }}>
                    Login
                  </button>
                  <button className={clientLoginStage === 'signup' || clientLoginStage === 'verify-signup' ? 'auth-tab active' : 'auth-tab'} type="button" onClick={() => { setClientLoginStage('signup'); setClientLoginNotice(''); setClientOtp(null); setClientOtpCode(''); setClientResetPassword(''); }}>
                    Sign up
                  </button>
                </div>

                {(clientLoginStage === 'login' || clientLoginStage === 'signup') && (
                  <div className="grid two controls-grid client-account-fields">
                    <div className="form-row full-width-row phone-combo-row">
                      <label htmlFor="clientLoginPhone">Mobile number</label>
                      <div className="phone-combo-control">
                        <ZipSelect
                          id="clientLoginCountry"
                          ariaLabel="Country code"
                          value={clientLoginCountryInput}
                          onChange={setClientLoginCountryInput}
                          className="phone-country-select"
                          options={PHONE_COUNTRIES.map((country) => ({
                            value: phoneCountryLabel(country),
                            label: `${country.name} ${country.dialCode}`
                          }))}
                        />
                        <input id="clientLoginPhone" value={clientLoginPhone} onChange={(event) => setClientLoginPhone(event.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="0712345678" />
                      </div>
                      <small>{previewPhone(selectedLoginCountry, clientLoginPhone)}</small>
                    </div>
                    {clientLoginStage === 'signup' && (
                      <div className="form-row signup-email-row">
                        <label htmlFor="clientLoginEmail">Email address</label>
                        <input id="clientLoginEmail" value={clientLoginEmail} onChange={(event) => setClientLoginEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" />
                        <small>We use this email address to send your one-time verification code.</small>
                      </div>
                    )}
                    <div className={clientLoginStage === 'signup' ? 'form-row signup-password-row' : 'form-row full-width-row'}>
                      <label htmlFor="clientPassword">Password</label>
                      <input id="clientPassword" value={clientPassword} onChange={(event) => setClientPassword(event.target.value)} type="password" autoComplete={clientLoginStage === 'signup' ? 'new-password' : 'current-password'} placeholder="Password" />
                      {clientLoginStage === 'login' && (
                        <button className="auth-text-link" type="button" onClick={openClientPasswordReset}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {clientLoginStage === 'verify-signup' && (
                  <div className="client-otp-box">
                    <p className="mini-copy">Enter the code sent to {clientOtp?.destination}. This verifies the email address for the new account.</p>
                    <div className="form-row">
                      <label htmlFor="clientOtpCode">Sign-up code</label>
                      <input id="clientOtpCode" value={clientOtpCode} onChange={(event) => setClientOtpCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" />
                    </div>
                    {clientOtp?.testOtpCode && <p className="delivery-note-pill">Temporary test-mode code: <strong>{clientOtp.testOtpCode}</strong></p>}
                    {clientOtp?.deliveryMode === 'server-console-preview' && <p className="delivery-note-pill">Local testing without email settings: check the Netlify dev terminal for the sign-up code.</p>}
                  </div>
                )}


                <div className="client-login-bottom client-auth-bottom">
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
                <div className="client-push-panel">
                  <div>
                    <strong>Push notifications</strong>
                    <span>
                      {!pushSupported
                        ? 'Phone push only. Use your mobile app/browser to activate.'
                        : !pushConfigured
                          ? 'Ready after push keys are added in Netlify.'
                          : pushSubscribed
                            ? 'Active on this device for booking updates.'
                            : 'Get booking confirmations on this device.'}
                    </span>
                  </div>
                  {pushSupported && pushConfigured && (
                    pushSubscribed ? (
                      <button className="pill" type="button" onClick={() => void disableClientPushNotifications()} disabled={pushBusy}>
                        {pushBusy ? 'Updating…' : 'Turn off'}
                      </button>
                    ) : (
                      <button className="button primary compact-button" type="button" onClick={() => void activateClientPushNotifications()} disabled={pushBusy}>
                        {pushBusy ? 'Activating…' : 'Activate'}
                      </button>
                    )
                  )}
                </div>
                {pushNotice && <p className={pushNotice.toLowerCase().includes('not') || pushNotice.toLowerCase().includes('could') || pushNotice.toLowerCase().includes('off') ? 'notice warning mobile-auth-notice' : 'notice success mobile-auth-notice'} role="status">{pushNotice}</p>}
                {clientBookingNotice && <p className={clientBookingNotice.toLowerCase().includes('could') || clientBookingNotice.toLowerCase().includes('cannot') || clientBookingNotice.toLowerCase().includes('expired') ? 'notice warning mobile-auth-notice' : 'notice success mobile-auth-notice'} role="status">{clientBookingNotice}</p>}
                <div className="client-booking-list">
                  {clientProfile.bookings.length ? clientProfile.bookings.map((booking) => {
                    const bookingDateTime = new Date(`${booking.date}T${booking.time}:00`);
                    const isPastBooking = bookingDateTime.getTime() < Date.now();
                    const isBusy = clientBookingActionKey === `${booking.id}-delete`;
                    return (
                      <article className="client-booking-item" key={booking.id}>
                        <div className="client-booking-item-main">
                          <strong>{booking.treatment}</strong>
                          <span>{getDayLabel(booking.date)} · {booking.time}–{booking.endTime}</span>
                          <em>{booking.practitioner} · {booking.status}</em>
                        </div>
                        <div className="client-booking-actions">
                          <button className="pill" type="button" disabled={isPastBooking || saving || isBusy} onClick={() => openEditClientBooking(booking)}>
                            Edit
                          </button>
                          <button className="pill danger" type="button" disabled={isPastBooking || saving || isBusy} onClick={() => void deleteClientBooking(booking)}>
                            {isBusy ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </article>
                    );
                  }) : <p className="mini-copy">No previous appointments found yet.</p>}
                </div>
              </div>
            )}
            {clientLoginNotice && <p className={clientLoginNotice.toLowerCase().includes('could not') || clientLoginNotice.toLowerCase().includes('not correct') || clientLoginNotice.toLowerCase().includes('expired') || clientLoginNotice.toLowerCase().includes('not recognised') ? 'notice warning mobile-auth-notice' : 'notice success mobile-auth-notice'} role="status">{clientLoginNotice}</p>}
          </div>
        </section>
      )}

      {clientPasswordResetOpen && (
        <section className="client-auth-popup client-reset-popup" aria-label="Reset client password" role="dialog" aria-modal="true">
          <div className="client-auth-card client-reset-card">
            <div className="client-auth-head">
              <div>
                <p className="badge blue-badge">Password help</p>
                <h2>Reset password</h2>
                <p className="mini-copy">Use your verified mobile number and saved email address to safely set a new password.</p>
              </div>
              <button className="icon-button mobile-close" type="button" aria-label="Close password reset" onClick={dismissClientModal}>×</button>
            </div>

            {clientLoginStage === 'forgot-password' && (
              <div className="grid two controls-grid reset-popup-body">
                <div className="client-reset-intro full-width-row">
                  <strong>Reset your password</strong>
                  <span>We will send a one-time code to the email address saved on your client account.</span>
                </div>
                <div className="form-row full-width-row phone-combo-row">
                  <label htmlFor="clientResetPhone">Mobile number</label>
                  <div className="phone-combo-control">
                    <ZipSelect
                      id="clientResetCountry"
                      ariaLabel="Country code"
                      value={clientLoginCountryInput}
                      onChange={setClientLoginCountryInput}
                      className="phone-country-select"
                      options={PHONE_COUNTRIES.map((country) => ({
                        value: phoneCountryLabel(country),
                        label: `${country.name} ${country.dialCode}`
                      }))}
                    />
                    <input id="clientResetPhone" value={clientLoginPhone} onChange={(event) => setClientLoginPhone(event.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="0712345678" />
                  </div>
                  <small>{previewPhone(selectedLoginCountry, clientLoginPhone)}</small>
                </div>
                <div className="form-row full-width-row">
                  <label htmlFor="clientResetEmail">Email address</label>
                  <input id="clientResetEmail" value={clientLoginEmail} onChange={(event) => setClientLoginEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" />
                  <small>Use the email address saved on your client account.</small>
                </div>
              </div>
            )}

            {clientLoginStage === 'reset-password' && (
              <div className="client-otp-box reset-popup-body">
                <p className="mini-copy">Enter the code sent to {clientOtp?.destination}, then choose a new password.</p>
                <div className="form-row">
                  <label htmlFor="clientResetOtpCode">Reset code</label>
                  <input id="clientResetOtpCode" value={clientOtpCode} onChange={(event) => setClientOtpCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" />
                </div>
                <div className="form-row">
                  <label htmlFor="clientResetNewPassword">New password</label>
                  <input id="clientResetNewPassword" value={clientResetPassword} onChange={(event) => setClientResetPassword(event.target.value)} type="password" autoComplete="new-password" placeholder="At least 6 characters" />
                  <small>Your old password will stop working after this reset.</small>
                </div>
                {clientOtp?.testOtpCode && <p className="delivery-note-pill">Temporary test-mode code: <strong>{clientOtp.testOtpCode}</strong></p>}
                {clientOtp?.deliveryMode === 'server-console-preview' && <p className="delivery-note-pill">Local testing without email settings: check the Netlify dev terminal for the reset code.</p>}
              </div>
            )}

            {clientLoginNotice && <p className={clientLoginNotice.toLowerCase().includes('could not') || clientLoginNotice.toLowerCase().includes('not correct') || clientLoginNotice.toLowerCase().includes('expired') || clientLoginNotice.toLowerCase().includes('not recognised') ? 'notice warning' : 'notice success'} role="status">{clientLoginNotice}</p>}

            <div className="client-login-bottom client-auth-bottom">
              {clientLoginStage === 'forgot-password' && (
                <>
                  <button className="pill" type="button" onClick={backToClientLoginFromReset}>Back to login</button>
                  <button className="button primary" type="button" onClick={requestClientPasswordResetCode} disabled={clientLoginLoading || !canRequestPasswordReset}>
                    {clientLoginLoading ? 'Sending code…' : 'Send reset code'}
                  </button>
                </>
              )}
              {clientLoginStage === 'reset-password' && (
                <>
                  <button className="pill" type="button" onClick={() => { setClientLoginStage('forgot-password'); setClientLoginNotice(''); setClientOtpCode(''); }}>Back</button>
                  <button className="button primary" type="button" onClick={confirmClientPasswordReset} disabled={clientLoginLoading || !canCompletePasswordReset}>
                    {clientLoginLoading ? 'Resetting…' : 'Reset and sign in'}
                  </button>
                  <button className="pill" type="button" onClick={requestClientPasswordResetCode} disabled={clientLoginLoading}>Send again</button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <form className={`booking-workflow ${bookingOpen ? 'is-open' : ''}`} onSubmit={handleSubmit}>
        <div className="workflow-card">
          <div className="workflow-head">
            <div>
              <p className="badge blue-badge">{editingClientBookingId ? 'Edit appointment' : `Step ${step + 1} of ${steps.length}`}</p>
              <h2>{editingClientBookingId && step === 3 ? 'Review changes' : steps[step]}</h2>
            </div>
            <button className="icon-button mobile-close" type="button" aria-label="Close booking flow" onClick={dismissClientModal}>×</button>
          </div>

          {error && (
            <div className="booking-inline-warning" role="alert">
              <strong>We could not confirm that booking yet.</strong>
              <span>{error}</span>
              <button className="pill" type="button" onClick={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>)} disabled={saving}>Try again</button>
            </div>
          )}

          {clientBookingNotice && (
            <div className="booking-inline-warning" role="alert">
              <strong>Booking update</strong>
              <span>{clientBookingNotice}</span>
            </div>
          )}

          {saving && (
            <div className="booking-confirmation-wait" role="status" aria-live="polite" aria-label="Waiting for booking confirmation">
              <div className="booking-wait-card">
                <div className="booking-wait-orbit" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p className="badge blue-badge">Confirming appointment</p>
                <h3>Please wait, we are checking the diary.</h3>
                <p>Your appointment is being confirmed securely. Please keep this screen open.</p>
              </div>
            </div>
          )}

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
                <ZipSelect
                  id="procedure"
                  value={activeProcedureId}
                  ariaLabel="Choose treatment"
                  onChange={(nextValue) => { setProcedureId(nextValue); resetSelection(); }}
                  options={procedures.map((procedure) => ({
                    value: procedure.id,
                    label: `${procedure.name} — ${procedure.durationMinutes} mins`
                  }))}
                />
              </div>
              <div className="form-row">
                <label htmlFor="practitioner">Dentist / practitioner</label>
                <ZipSelect
                  id="practitioner"
                  value={practitionerChoice}
                  ariaLabel="Choose dentist or practitioner"
                  onChange={(nextValue) => { setPractitionerChoice(nextValue); resetSelection(); }}
                  options={[
                    { value: FIRST_AVAILABLE, label: 'First available' },
                    ...eligiblePractitioners.map((practitioner) => ({
                      value: practitioner.id,
                      label: `${practitioner.name} — ${practitioner.role}`
                    }))
                  ]}
                />
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
                <DatePickerField id="date" value={selectedDate} required ariaLabel="Choose diary date" onChange={(nextDate) => { setSelectedDate(nextDate); resetSelection(); }} />
              </div>
              <div className="summary-strip">
                <strong>{loading ? 'Loading diary…' : getDayLabel(selectedDate)}</strong>
                <span>{availableSlots.length} Available Times</span>
              </div>
              {selectedTime ? (
                <div className="selected-slot-summary">
                  <span>Selected time</span>
                  <strong>{selectedTime}{selectedSlot?.endTime ? `–${selectedSlot.endTime}` : ''} · {selectedPractitioner?.name ?? 'Practitioner selected'}</strong>
                </div>
              ) : (
                <p className="mini-copy">Choose a date, then open the time selector to view the full list of available appointment times.</p>
              )}
              <div className="diary-inline-actions">
                <button className="pill" type="button" onClick={() => setStep(1)} disabled={saving}>Back</button>
                <button className="button primary" type="button" onClick={openTimePicker} disabled={loading || saving}>
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
                    <p className="mini-copy">Select a start time. Longer appointments will visibly cover the extra diary blocks they need.</p>
                  </div>
                  <button className="icon-button mobile-close" type="button" aria-label="Close time selector" onClick={dismissClientModal}>×</button>
                </div>

                <div className="time-picker-slots" role="list" aria-label="Available appointment times">
                  {slots.map((slot) => {
                    const isSelectedSlot = selectedTime === slot.time && selectedPractitionerId === slot.practitionerId;
                    const isCoveredBySelection = Boolean(
                      selectedSlot &&
                      selectedSlot.practitionerId === slot.practitionerId &&
                      slotStartsInsideSelectedAppointment(slot.time, selectedSlot.time, selectedSlot.endTime)
                    );
                    const hasPassed = slotHasPassed(selectedDate, slot.time, now);
                    const canSelectSlot = slot.available && !hasPassed;
                    return (
                      <button
                        key={`${slot.time}-${slot.endTime}-${slot.practitionerId ?? 'none'}`}
                        className={`slot ${canSelectSlot ? 'available' : 'unavailable'} ${hasPassed ? 'past' : ''} ${isSelectedSlot ? 'selected' : ''} ${isCoveredBySelection ? 'covered' : ''}`}
                        disabled={!canSelectSlot || saving}
                        type="button"
                        onClick={() => {
                          setSelectedTime(slot.time);
                          setSelectedPractitionerId(slot.practitionerId ?? '');
                        }}
                      >
                        <strong>{slot.time}</strong>
                        <span>{hasPassed ? 'Time passed' : isCoveredBySelection ? 'Included in selected appointment' : slot.available ? `${slot.endTime} · ${slot.practitionerName}` : slot.reason ?? 'Unavailable'}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="time-picker-actions">
                  <button className="pill" type="button" onClick={dismissClientModal}>Back</button>
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
                <h3>{editingClientBookingId ? 'Review your changes' : 'Review your appointment'}</h3>
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
                  {saving ? 'Checking diary…' : editingClientBookingId ? 'Save changes' : 'Book appointment'}
                </button>
              )}
            </div>
          )}
        </div>
      </form>


      {successBooking && (
        <section className="booking-success-page" aria-labelledby="booking-success-title" role="dialog" aria-modal="true">
          <div className="booking-success-card">
            <div className="booking-success-head">
              <p className="badge blue-badge">{successBooking.kind === 'updated' ? 'Booking updated' : 'Booking confirmed'}</p>
              <h2 id="booking-success-title">{successBooking.kind === 'updated' ? 'Appointment updated.' : 'Appointment confirmed.'}</h2>
              <p className="mini-copy success-mini-copy">Your booking details are below. Use Copy to save or share them.</p>
            </div>

            <div className="booking-success-body">
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
            </div>

            <div className="success-actions">
              <button className="button primary" type="button" onClick={() => void returnToClientAppAfterBooking()}>
                Back to app
              </button>
              <button
                className="pill"
                type="button"
                onClick={() => void returnToClientAppAfterBooking()}
              >
                Close
              </button>
            </div>
          </div>
        </section>
      )}

      <ClientInstallPrompt />

    </main>
  );
}
