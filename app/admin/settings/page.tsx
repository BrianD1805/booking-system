'use client';

import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Header } from '@/components/Header';
import { ZipSelect } from '@/components/ZipSelect';
import { APP_VERSION } from '@/lib/mockData';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type PracticeSettingsForm = {
  practiceName: string; publicDisplayName: string; address: string; phone: string; email: string; logoUrl: string;
  timezone: string; currencyCode: string; countryCode: string; workingDays: number[]; workingStartTime: string;
  workingEndTime: string; lunchBreakEnabled: boolean; lunchBreakStart: string; lunchBreakEnd: string;
  slotIntervalMinutes: number; minimumNoticeHours: number; maxBookingAheadDays: number; allowSameDayBookings: boolean;
  cancellationPolicyNote: string; clientAppUrl?: string; adminAppUrl?: string; tenantSlug?: string;
};
type ProcedureItem = { id: string; name: string; durationMinutes: number; priceGuide: string; active: boolean; displayOrder: number };
type PractitionerItem = { id: string; name: string; role: string; active: boolean; displayOrder: number; procedureIds: string[] };
type ScheduleDay = { practitionerId: string; dayOfWeek: number; startTime: string; endTime: string; active: boolean; lunchBreakEnabled: boolean; lunchBreakStart: string; lunchBreakEnd: string };
type LeaveItem = { id: string; practitionerId: string; startDate: string; endDate: string; startTime: string; endTime: string; reason: string; days: number };
type SettingsPayload = { settings: PracticeSettingsForm; procedures: ProcedureItem[]; practitioners: PractitionerItem[]; workingHours: ScheduleDay[]; leave: LeaveItem[] };
type ModalKind = 'profile' | 'hours' | 'rules' | 'procedure' | 'practitioner' | 'schedule' | 'leave' | 'delete' | null;
type DeleteTarget = { type: 'procedure' | 'practitioner' | 'leave'; id: string; label: string; practitionerId?: string };
const weekdays = [{ n: 1, name: 'Monday', short: 'Mon' }, { n: 2, name: 'Tuesday', short: 'Tue' }, { n: 3, name: 'Wednesday', short: 'Wed' }, { n: 4, name: 'Thursday', short: 'Thu' }, { n: 5, name: 'Friday', short: 'Fri' }, { n: 6, name: 'Saturday', short: 'Sat' }, { n: 0, name: 'Sunday', short: 'Sun' }];
const defaultSettings: PracticeSettingsForm = {
  practiceName: '', publicDisplayName: '', address: '', phone: '', email: '', logoUrl: '', timezone: 'Africa/Nairobi',
  currencyCode: 'KES', countryCode: 'KE', workingDays: [1, 2, 3, 4, 5], workingStartTime: '08:30',
  workingEndTime: '17:00', lunchBreakEnabled: false, lunchBreakStart: '13:00', lunchBreakEnd: '14:00',
  slotIntervalMinutes: 30, minimumNoticeHours: 2, maxBookingAheadDays: 90, allowSameDayBookings: true,
  cancellationPolicyNote: ''
};
const blankProcedure: ProcedureItem = { id: '', name: '', durationMinutes: 30, priceGuide: '', active: true, displayOrder: 100 };
const blankPractitioner: PractitionerItem = { id: '', name: '', role: 'Dentist', active: true, displayOrder: 100, procedureIds: [] };
const isoToday = () => new Date().toISOString().slice(0, 10);
const displayDate = (date: string) => date ? date.split('-').reverse().join('/') : '—';
const dayList = (days: number[]) => weekdays.filter(({ n }) => days.includes(n)).map(({ short }) => short).join(' · ');

function SettingsModal({ title, subtitle, onClose, onSave, busy, saveLabel = 'Save changes', danger = false, error, children }: {
  title: string; subtitle?: string; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean; saveLabel?: string; danger?: boolean; error?: string; children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, .zip-select-button, button')?.focus());
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose(); }
      if (event.key === 'Tab' && formRef.current) {
        const candidates = [...formRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]')].filter((node) => node.offsetParent !== null);
        const first = candidates[0]; const last = candidates[candidates.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previous; window.cancelAnimationFrame(focusTimer); document.removeEventListener('keydown', handleKey); };
  }, [onClose, busy]);
  return createPortal(
    <div className="settings-054-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <form ref={formRef} className="settings-054-modal" role="dialog" aria-modal="true" aria-label={title} onSubmit={onSave}>
        <header className="settings-054-modal-head">
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="settings-054-close" type="button" onClick={onClose} aria-label="Close popup" disabled={busy}>×</button>
        </header>
        <div className="settings-054-modal-scroll">
          {error && <div className="notice warning" role="alert">{error}</div>}
          {children}
        </div>
        <footer className="settings-054-modal-footer">
          <button className="pill" type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`button ${danger ? 'danger' : 'primary'} admin-busy-button`} disabled={busy} type="submit">
            {busy && <span className="admin-spinner" aria-hidden="true" />}{saveLabel}
          </button>
        </footer>
      </form>
    </div>, document.body
  );
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsPayload>({ settings: defaultSettings, procedures: [], practitioners: [], workingHours: [], leave: [] });
  const [selectedPractitionerId, setSelectedPractitionerId] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [settingsDraft, setSettingsDraft] = useState<PracticeSettingsForm>(defaultSettings);
  const [procedureDraft, setProcedureDraft] = useState<ProcedureItem>(blankProcedure);
  const [practitionerDraft, setPractitionerDraft] = useState<PractitionerItem>(blankPractitioner);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDay[]>([]);
  const [leaveDraft, setLeaveDraft] = useState({ startDate: isoToday(), endDate: isoToday(), fullDay: true, startTime: '09:00', endTime: '17:00', reason: 'Annual leave' });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [syncMatching, setSyncMatching] = useState(true);
  const [syncAll, setSyncAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  function applyPayload(payload: SettingsPayload) {
    setData({ settings: { ...defaultSettings, ...payload.settings }, procedures: payload.procedures ?? [], practitioners: payload.practitioners ?? [], workingHours: payload.workingHours ?? [], leave: payload.leave ?? [] });
    setSelectedPractitionerId((previous) => payload.practitioners?.some((p) => p.id === previous) ? previous : (payload.practitioners?.[0]?.id ?? ''));
  }
  async function callApi(url: string, init?: RequestInit) {
    const response = await fetch(url, { ...init, cache: 'no-store', headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...makeAdminAuthHeaders() } });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Could not save changes.');
    return json as SettingsPayload;
  }
  async function loadSettings(silent = false) {
    setLoading(true); setError('');
    try { applyPayload(await callApi('/api/admin-settings')); if (!silent) showAdminToast('Practice settings refreshed.', 'info'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load settings.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadSettings(true); }, []);
  const selectedPractitioner = data.practitioners.find((item) => item.id === selectedPractitionerId) ?? null;
  const clinicianSchedule = useMemo(() => data.workingHours.filter((day) => day.practitionerId === selectedPractitionerId), [data.workingHours, selectedPractitionerId]);
  const clinicianLeave = useMemo(() => data.leave.filter((entry) => entry.practitionerId === selectedPractitionerId), [data.leave, selectedPractitionerId]);
  const activeDays = clinicianSchedule.filter((day) => day.active).length;
  const selectedProcedures = selectedPractitioner?.procedureIds.map((id) => data.procedures.find((procedure) => procedure.id === id)?.name).filter(Boolean) ?? [];

  function openModal(next: ModalKind) {
    setModalError(''); setSettingsDraft({ ...data.settings, workingDays: [...data.settings.workingDays] });
    setSyncMatching(true); setSyncAll(false); setModal(next);
  }
  function openProcedure(item?: ProcedureItem) { setProcedureDraft(item ? { ...item } : { ...blankProcedure }); openModal('procedure'); }
  function openPractitioner(item?: PractitionerItem) { setPractitionerDraft(item ? { ...item, procedureIds: [...item.procedureIds] } : { ...blankPractitioner, procedureIds: [] }); openModal('practitioner'); }
  function openSchedule() {
    if (!selectedPractitioner) return;
    const schedule = weekdays.map(({ n }) => {
      const found = clinicianSchedule.find((item) => item.dayOfWeek === n);
      return found ? { ...found } : { practitionerId: selectedPractitioner.id, dayOfWeek: n, active: false,
        startTime: data.settings.workingStartTime, endTime: data.settings.workingEndTime, lunchBreakEnabled: false, lunchBreakStart: '13:00', lunchBreakEnd: '14:00' };
    });
    setScheduleDraft(schedule); openModal('schedule');
  }
  function openLeave() { setLeaveDraft({ startDate: isoToday(), endDate: isoToday(), fullDay: true, startTime: '09:00', endTime: '17:00', reason: 'Annual leave' }); openModal('leave'); }
  function openDelete(type: DeleteTarget['type'], id: string, label: string, practitionerId?: string) { setDeleteTarget({ type, id, label, practitionerId }); openModal('delete'); }
  function updateDay(dayOfWeek: number, patch: Partial<ScheduleDay>) { setScheduleDraft((all) => all.map((day) => day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)); }
  const closeModal = useCallback(() => setModal(null), []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setBusy(true); setModalError('');
    try {
      let result: SettingsPayload;
      let notification = 'Changes saved.';
      if (modal === 'profile' || modal === 'hours' || modal === 'rules') {
        result = await callApi('/api/admin-settings', { method: 'PATCH', body: JSON.stringify({ section: modal, settings: settingsDraft, adjustMatchingSchedules: syncMatching && !syncAll, syncAllPractitionerHours: syncAll }) });
        notification = modal === 'profile' ? 'Practice profile saved.' : modal === 'hours' ? 'Practice hours saved.' : 'Booking rules saved.';
      } else if (modal === 'procedure') {
        result = await callApi('/api/admin-settings', { method: 'POST', body: JSON.stringify({ type: 'procedure', ...procedureDraft }) });
        notification = procedureDraft.id ? 'Procedure updated.' : 'Procedure added.';
      } else if (modal === 'practitioner') {
        result = await callApi('/api/admin-settings', { method: 'POST', body: JSON.stringify({ type: 'practitioner', ...practitionerDraft }) });
        notification = practitionerDraft.id ? 'Practitioner updated.' : 'Practitioner added.';
      } else if (modal === 'schedule') {
        result = await callApi('/api/admin-settings', { method: 'POST', body: JSON.stringify({ type: 'practitioner-schedule', practitionerId: selectedPractitionerId, days: scheduleDraft }) });
        notification = `${selectedPractitioner?.name ?? 'Practitioner'}'s weekly diary saved.`;
      } else if (modal === 'leave') {
        result = await callApi('/api/admin-settings', { method: 'POST', body: JSON.stringify({ type: 'practitioner-leave', practitionerId: selectedPractitionerId, ...leaveDraft }) });
        notification = 'Leave added. The diary will block these dates.';
      } else if (modal === 'delete' && deleteTarget) {
        const params = new URLSearchParams({ type: deleteTarget.type, id: deleteTarget.id });
        if (deleteTarget.practitionerId) params.set('practitionerId', deleteTarget.practitionerId);
        result = await callApi(`/api/admin-settings?${params.toString()}`, { method: 'DELETE' });
        notification = 'Item removed or deactivated.';
      } else return;
      applyPayload(result); closeModal(); showAdminToast(notification);
    } catch (caught) { setModalError(caught instanceof Error ? caught.message : 'Could not save changes.'); }
    finally { setBusy(false); }
  }
  function field(label: string, value: string, onChange: (value: string) => void, extra?: { type?: string; placeholder?: string; readOnly?: boolean }) {
    return <label className="settings-054-field"><span>{label}</span><input type={extra?.type ?? 'text'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={extra?.placeholder} readOnly={extra?.readOnly} /></label>;
  }
  function settingField<K extends keyof PracticeSettingsForm>(key: K, label: string, type = 'text') {
    const value = settingsDraft[key];
    return field(label, String(value ?? ''), (next) => setSettingsDraft((current) => ({ ...current, [key]: type === 'number' ? Number(next) : next })), { type });
  }

  const modalTitle = modal === 'profile' ? 'Edit practice profile' : modal === 'hours' ? 'Edit practice opening hours' : modal === 'rules' ? 'Edit booking rules' :
    modal === 'procedure' ? (procedureDraft.id ? 'Edit procedure' : 'Add procedure') : modal === 'practitioner' ? (practitionerDraft.id ? 'Edit practitioner' : 'Add practitioner') :
    modal === 'schedule' ? `Weekly diary · ${selectedPractitioner?.name ?? ''}` : modal === 'leave' ? `Record absence · ${selectedPractitioner?.name ?? ''}` : 'Confirm removal';

  return (
    <main className="shell fresh-shell admin-shell settings-054-page">
      <Header area="admin" />
      <section className="admin-command settings-054-heading">
        <div><p className="badge blue-badge">Practice settings · {APP_VERSION}</p><h1 className="hero-title clean-title">Practice settings</h1><p className="hero-copy tight-copy">Review the practice at a glance. Select Edit to make changes in a popup.</p></div>
        <button type="button" className="pill admin-compact-button" disabled={loading || busy} onClick={() => void loadSettings()}>Refresh settings</button>
      </section>
      {error && <div className="notice warning" role="alert">{error}</div>}
      {loading && <p className="mini-copy" role="status">Loading practice settings…</p>}
      <div className="settings-054-overview">
        <section className="card clean-panel settings-054-card">
          <div className="settings-054-card-head"><div><span className="settings-054-eyebrow">Practice</span><h2>Practice profile</h2></div><button type="button" className="pill" onClick={() => openModal('profile')} disabled={loading}>Edit</button></div>
          <strong>{data.settings.publicDisplayName || data.settings.practiceName || 'Practice name not set'}</strong>
          <p>{data.settings.email || 'No email set'}{data.settings.phone ? ` · ${data.settings.phone}` : ''}</p>
          <div className="settings-054-small-meta"><span>{data.settings.timezone}</span><span>{data.settings.currencyCode} · {data.settings.countryCode}</span></div>
        </section>
        <section className="card clean-panel settings-054-card">
          <div className="settings-054-card-head"><div><span className="settings-054-eyebrow">Business diary</span><h2>Practice opening hours</h2></div><button type="button" className="pill" onClick={() => openModal('hours')} disabled={loading}>Edit</button></div>
          <strong>{data.settings.workingStartTime} – {data.settings.workingEndTime}</strong>
          <p>{dayList(data.settings.workingDays)}</p>
          <div className="settings-054-small-meta"><span>{data.settings.lunchBreakEnabled ? `Practice-wide lunch closure: ${data.settings.lunchBreakStart}–${data.settings.lunchBreakEnd}` : 'No practice-wide lunch closure'}</span></div>
        </section>
        <section className="card clean-panel settings-054-card">
          <div className="settings-054-card-head"><div><span className="settings-054-eyebrow">Appointments</span><h2>Booking rules</h2></div><button type="button" className="pill" onClick={() => openModal('rules')} disabled={loading}>Edit</button></div>
          <strong>{data.settings.slotIntervalMinutes}-minute diary slots</strong>
          <p>{data.settings.minimumNoticeHours}h minimum notice · {data.settings.maxBookingAheadDays} days ahead</p>
          <div className="settings-054-small-meta"><span>Same-day booking: {data.settings.allowSameDayBookings ? 'Allowed' : 'Not allowed'}</span></div>
        </section>
      </div>

      <section className="card clean-panel settings-054-section">
        <div className="settings-054-section-heading"><div><span className="settings-054-eyebrow">Clinical team</span><h2>Practitioner diary settings</h2><p>Choose a practitioner to manage their schedule, lunch breaks and leave. These settings control actual booking availability.</p></div><button type="button" className="button primary" onClick={() => openPractitioner()} disabled={loading}>Add practitioner</button></div>
        <div className="settings-054-practitioner-picker"><label htmlFor="settings-practitioner-select">Select practitioner</label><ZipSelect id="settings-practitioner-select" value={selectedPractitionerId} onChange={setSelectedPractitionerId} options={data.practitioners.map((doctor) => ({ value: doctor.id, label: `${doctor.name}${doctor.active ? '' : ' (inactive)'}`, description: doctor.role }))} placeholder="Choose a practitioner" disabled={loading || !data.practitioners.length} /></div>
        {selectedPractitioner ? <>
          <div className="settings-054-clinician-banner"><div><h3>{selectedPractitioner.name}</h3><p>{selectedPractitioner.role} · {selectedPractitioner.active ? 'Active' : 'Inactive'} · {activeDays} working day{activeDays === 1 ? '' : 's'} per week</p></div><div className="settings-054-quick-actions"><button type="button" className="pill" onClick={() => openPractitioner(selectedPractitioner)}>Edit practitioner</button><button type="button" className="pill" onClick={openSchedule}>Working hours & lunch</button><button type="button" className="button primary" onClick={openLeave}>Add leave / absence</button></div></div>
          <div className="settings-054-two-columns">
            <div className="settings-054-inner-panel"><div className="settings-054-inner-head"><h3>Weekly working hours</h3><button type="button" className="pill" onClick={openSchedule}>Edit</button></div><div className="settings-054-week-summary">{weekdays.map(({ n, short }) => { const current = clinicianSchedule.find((day) => day.dayOfWeek === n && day.active); return <div key={n} className="settings-054-week-row"><strong>{short}</strong><span>{current ? `${current.startTime}–${current.endTime}` : 'Not working'}</span><small>{current?.lunchBreakEnabled ? `Lunch ${current.lunchBreakStart}–${current.lunchBreakEnd}` : current ? 'No lunch block' : ''}</small></div>; })}</div></div>
            <div className="settings-054-inner-panel"><div className="settings-054-inner-head"><h3>Leave & unavailable times</h3><button type="button" className="pill" onClick={openLeave}>Add absence</button></div>{clinicianLeave.length ? <div className="settings-054-leave-list">{clinicianLeave.map((entry) => <div className="settings-054-leave-item" key={entry.id}><div><strong>{entry.reason}</strong><p>{displayDate(entry.startDate)}{entry.startDate !== entry.endDate ? ` – ${displayDate(entry.endDate)}` : ''}</p><small>{entry.startTime === '00:00' && entry.endTime === '23:59' ? 'Full day' : `${entry.startTime}–${entry.endTime}`} · {entry.days} day{entry.days === 1 ? '' : 's'}</small></div><button type="button" className="pill" onClick={() => openDelete('leave', entry.id, entry.reason, entry.practitionerId)}>Remove</button></div>)}</div> : <p className="settings-054-empty">No leave or other unavailable periods recorded.</p>}
              <div className="settings-054-subnote">Existing bookings must be rescheduled before overlapping leave can be saved. Leave blocks the diary only for this practitioner.</div></div>
          </div>
          <div className="settings-054-procedure-summary"><strong>Procedures this practitioner can perform</strong><p>{selectedProcedures.length ? selectedProcedures.join(' · ') : 'No procedures linked. Use Edit practitioner to assign them.'}</p></div>
          <div className="settings-054-muted-actions"><button type="button" className="pill" onClick={() => openDelete('practitioner', selectedPractitioner.id, selectedPractitioner.name)}>Remove / deactivate practitioner</button></div>
        </> : <p className="settings-054-empty">Add a practitioner to configure individual working hours and leave.</p>}
      </section>
      <section className="card clean-panel settings-054-section">
        <div className="settings-054-section-heading"><div><span className="settings-054-eyebrow">Services</span><h2>Procedures</h2><p>Each procedure has its own duration, visibility and practitioner assignments.</p></div><button type="button" className="button primary" onClick={() => openProcedure()} disabled={loading}>Add procedure</button></div>
        <div className="settings-054-list">{data.procedures.map((procedure) => <article key={procedure.id} className={`settings-054-list-item ${procedure.active ? '' : 'inactive'}`}><div><strong>{procedure.name}</strong><p>{procedure.durationMinutes} minutes · {procedure.priceGuide || 'No price guide'} · {procedure.active ? 'Active' : 'Inactive'}</p></div><div className="settings-054-list-actions"><button type="button" className="pill" onClick={() => openProcedure(procedure)}>Edit</button><button type="button" className="pill" onClick={() => openDelete('procedure', procedure.id, procedure.name)}>Remove</button></div></article>)}</div>
      </section>

      {modal && <SettingsModal title={modalTitle} subtitle={modal === 'hours' ? 'Practice-wide boundaries appear in the diary. Individual clinicians may have shorter working hours.' : modal === 'schedule' ? 'Save this practitioner’s working days, times and individual lunch breaks.' : undefined} onClose={closeModal} onSave={save} busy={busy} error={modalError} danger={modal === 'delete'} saveLabel={modal === 'delete' ? 'Confirm removal' : modal === 'leave' ? 'Save absence' : modal === 'procedure' ? 'Save procedure' : modal === 'practitioner' ? 'Save practitioner' : modal === 'schedule' ? 'Save weekly diary' : 'Save changes'}>
        {modal === 'profile' && <div className="settings-054-form-grid">
          {settingField('practiceName', 'Practice name')}{settingField('publicDisplayName', 'Public display name')}{settingField('email', 'Practice email', 'email')}{settingField('phone', 'Practice phone', 'tel')}
          <label className="settings-054-field span-two"><span>Address</span><textarea value={settingsDraft.address} onChange={(event) => setSettingsDraft({ ...settingsDraft, address: event.target.value })} /></label>
          {settingField('logoUrl','Logo URL (optional)')}{settingField('timezone','Timezone (e.g. Europe/London)')}{settingField('currencyCode','Currency (GBP, KES…)')}{settingField('countryCode','Country (GB, KE…)')}
          {field('Booking app URL', data.settings.clientAppUrl ?? '', () => undefined, { readOnly: true })}
        </div>}
        {modal === 'hours' && <div className="settings-054-modal-stack">
          <div className="settings-054-field"><span>Days the practice is open</span><div className="settings-054-day-selector">{weekdays.map(({ n, short }) => <button key={n} type="button" className={settingsDraft.workingDays.includes(n) ? 'selected' : ''} onClick={() => setSettingsDraft((value) => ({ ...value, workingDays: value.workingDays.includes(n) ? (value.workingDays.length > 1 ? value.workingDays.filter((day) => day !== n) : value.workingDays) : [...value.workingDays, n].sort() }))}>{short}</button>)}</div></div>
          <div className="settings-054-form-grid">{settingField('workingStartTime','Open from','time')}{settingField('workingEndTime','Close at','time')}</div>
          <label className="settings-054-checkbox"><input type="checkbox" checked={settingsDraft.lunchBreakEnabled} onChange={(event) => setSettingsDraft({ ...settingsDraft, lunchBreakEnabled: event.target.checked })} /><span><strong>Close the entire practice for lunch</strong><small>Use only when every practitioner stops working. Individual lunch breaks are set under each doctor.</small></span></label>
          {settingsDraft.lunchBreakEnabled && <div className="settings-054-form-grid">{settingField('lunchBreakStart','Practice lunch start','time')}{settingField('lunchBreakEnd','Practice lunch end','time')}</div>}
          <label className="settings-054-checkbox"><input type="checkbox" checked={syncMatching && !syncAll} onChange={(event) => setSyncMatching(event.target.checked)} disabled={syncAll} /><span><strong>Adjust matching practitioner start/finish times</strong><small>Only shifts currently matching the previous practice boundary will change. Custom schedules stay unchanged.</small></span></label>
          <label className="settings-054-checkbox"><input type="checkbox" checked={syncAll} onChange={(event) => setSyncAll(event.target.checked)} /><span><strong>Set all active doctor shifts to these practice hours</strong><small>This also updates individual schedules currently ending at 17:00 even if your practice is already set to 18:00. It will replace custom start and finish times, but retain each doctor’s working days and lunch breaks.</small></span></label>
        </div>}
        {modal === 'rules' && <div className="settings-054-modal-stack">
          <div className="settings-054-form-grid">{settingField('slotIntervalMinutes','Diary slot interval (minutes)','number')}{settingField('minimumNoticeHours','Minimum notice (hours)','number')}{settingField('maxBookingAheadDays','Maximum booking ahead (days)','number')}</div>
          <label className="settings-054-checkbox"><input type="checkbox" checked={settingsDraft.allowSameDayBookings} onChange={(event) => setSettingsDraft({ ...settingsDraft, allowSameDayBookings: event.target.checked })} /><span><strong>Allow same-day bookings</strong></span></label>
          <label className="settings-054-field"><span>Cancellation and reschedule guidance</span><textarea value={settingsDraft.cancellationPolicyNote} onChange={(event) => setSettingsDraft({ ...settingsDraft, cancellationPolicyNote: event.target.value })} /></label>
        </div>}
        {modal === 'procedure' && <div className="settings-054-modal-stack"><div className="settings-054-form-grid">
          {field('Procedure name', procedureDraft.name, (value) => setProcedureDraft({ ...procedureDraft, name: value }))}
          {field('Duration in minutes', String(procedureDraft.durationMinutes), (value) => setProcedureDraft({ ...procedureDraft, durationMinutes: Number(value) }), { type: 'number' })}
          {field('Price / billing guide', procedureDraft.priceGuide, (value) => setProcedureDraft({ ...procedureDraft, priceGuide: value }))}
          {field('Display order', String(procedureDraft.displayOrder), (value) => setProcedureDraft({ ...procedureDraft, displayOrder: Number(value) }), { type: 'number' })}
        </div><label className="settings-054-checkbox"><input type="checkbox" checked={procedureDraft.active} onChange={(event) => setProcedureDraft({ ...procedureDraft, active: event.target.checked })} /><span><strong>Procedure active</strong></span></label></div>}
        {modal === 'practitioner' && <div className="settings-054-modal-stack"><div className="settings-054-form-grid">
          {field('Practitioner name', practitionerDraft.name, (value) => setPractitionerDraft({ ...practitionerDraft, name: value }))}
          {field('Role', practitionerDraft.role, (value) => setPractitionerDraft({ ...practitionerDraft, role: value }))}
          {field('Display order', String(practitionerDraft.displayOrder), (value) => setPractitionerDraft({ ...practitionerDraft, displayOrder: Number(value) }), { type: 'number' })}
        </div><label className="settings-054-checkbox"><input type="checkbox" checked={practitionerDraft.active} onChange={(event) => setPractitionerDraft({ ...practitionerDraft, active: event.target.checked })} /><span><strong>Practitioner active</strong></span></label>
          <div className="settings-054-field"><span>Procedures this practitioner can perform</span><div className="settings-054-procedure-tags">{data.procedures.map((procedure) => <button type="button" key={procedure.id} className={practitionerDraft.procedureIds.includes(procedure.id) ? 'selected' : ''} onClick={() => setPractitionerDraft((current) => ({ ...current, procedureIds: current.procedureIds.includes(procedure.id) ? current.procedureIds.filter((id) => id !== procedure.id) : [...current.procedureIds, procedure.id] }))}>{procedure.name}</button>)}</div></div>
        </div>}
        {modal === 'schedule' && <div className="settings-054-modal-stack"><p className="settings-054-help">Set different hours and lunch times for each day. Uncheck a day to mark the clinician as not working. The practice’s overall opening hours still apply.</p>
          {weekdays.map(({ n, name }) => { const day = scheduleDraft.find((item) => item.dayOfWeek === n); if (!day) return null; return <div className={`settings-054-day-editor ${day.active ? '' : 'is-off'}`} key={n}>
            <label className="settings-054-checkbox"><input type="checkbox" checked={day.active} onChange={(event) => updateDay(n, { active: event.target.checked })} /><span><strong>{name}</strong><small>{day.active ? 'Working' : 'Not working'}</small></span></label>
            {day.active && <><div className="settings-054-form-grid"><label className="settings-054-field"><span>From</span><input type="time" value={day.startTime} onChange={(event) => updateDay(n, { startTime: event.target.value })} /></label><label className="settings-054-field"><span>Until</span><input type="time" value={day.endTime} onChange={(event) => updateDay(n, { endTime: event.target.value })} /></label></div>
              <label className="settings-054-checkbox compact"><input type="checkbox" checked={day.lunchBreakEnabled} onChange={(event) => updateDay(n, { lunchBreakEnabled: event.target.checked })} /><span><strong>Lunch break for {name}</strong></span></label>
              {day.lunchBreakEnabled && <div className="settings-054-form-grid"><label className="settings-054-field"><span>Lunch from</span><input type="time" value={day.lunchBreakStart} onChange={(event) => updateDay(n, { lunchBreakStart: event.target.value })} /></label><label className="settings-054-field"><span>Lunch until</span><input type="time" value={day.lunchBreakEnd} onChange={(event) => updateDay(n, { lunchBreakEnd: event.target.value })} /></label></div>}
            </>}
          </div>; })}
        </div>}
        {modal === 'leave' && <div className="settings-054-modal-stack"><p className="settings-054-help">Block a single day, several days or a specific time window for this practitioner. Existing patient appointments will not be cancelled.</p>
          <div className="settings-054-form-grid"><label className="settings-054-field"><span>From date</span><input type="date" value={leaveDraft.startDate} onChange={(event) => setLeaveDraft({ ...leaveDraft, startDate: event.target.value, endDate: event.target.value > leaveDraft.endDate ? event.target.value : leaveDraft.endDate })} /></label><label className="settings-054-field"><span>To date</span><input type="date" min={leaveDraft.startDate} value={leaveDraft.endDate} onChange={(event) => setLeaveDraft({ ...leaveDraft, endDate: event.target.value })} /></label></div>
          <label className="settings-054-checkbox"><input type="checkbox" checked={leaveDraft.fullDay} onChange={(event) => setLeaveDraft({ ...leaveDraft, fullDay: event.target.checked })} /><span><strong>Full day(s)</strong><small>Uncheck for appointments, meetings or half-day absences.</small></span></label>
          {!leaveDraft.fullDay && <div className="settings-054-form-grid">{field('Unavailable from', leaveDraft.startTime, (value) => setLeaveDraft({ ...leaveDraft, startTime: value }), { type: 'time' })}{field('Until', leaveDraft.endTime, (value) => setLeaveDraft({ ...leaveDraft, endTime: value }), { type: 'time' })}</div>}
          <label className="settings-054-field"><span>Reason</span><input value={leaveDraft.reason} onChange={(event) => setLeaveDraft({ ...leaveDraft, reason: event.target.value })} placeholder="Annual leave, sick leave, training…" /></label>
        </div>}
        {modal === 'delete' && deleteTarget && <div className="settings-054-modal-stack"><p>Remove <strong>{deleteTarget.label}</strong>?</p><p className="settings-054-help">Procedures and practitioners with existing bookings are deactivated rather than permanently deleted. Removing leave reopens the affected availability, subject to working hours.</p></div>}
      </SettingsModal>}
    </main>
  );
}
