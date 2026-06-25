'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type PracticeSettingsForm = {
  practiceName: string;
  publicDisplayName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  timezone: string;
  currencyCode: string;
  countryCode: string;
  workingDays: number[];
  workingStartTime: string;
  workingEndTime: string;
  lunchBreakEnabled: boolean;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  slotIntervalMinutes: number;
  minimumNoticeHours: number;
  maxBookingAheadDays: number;
  allowSameDayBookings: boolean;
  cancellationPolicyNote: string;
  clientAppUrl?: string;
  adminAppUrl?: string;
  tenantSlug?: string;
};

type ProcedureItem = {
  id: string;
  name: string;
  durationMinutes: number;
  priceGuide: string;
  active: boolean;
  displayOrder: number;
};

type PractitionerItem = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  displayOrder: number;
  procedureIds: string[];
};

type SettingsPayload = {
  settings: PracticeSettingsForm;
  procedures: ProcedureItem[];
  practitioners: PractitionerItem[];
};

const emptySettings: PracticeSettingsForm = {
  practiceName: '',
  publicDisplayName: '',
  address: '',
  phone: '',
  email: '',
  logoUrl: '',
  timezone: 'Africa/Nairobi',
  currencyCode: 'KES',
  countryCode: 'KE',
  workingDays: [1, 2, 3, 4, 5],
  workingStartTime: '08:30',
  workingEndTime: '17:00',
  lunchBreakEnabled: false,
  lunchBreakStart: '13:00',
  lunchBreakEnd: '14:00',
  slotIntervalMinutes: 30,
  minimumNoticeHours: 2,
  maxBookingAheadDays: 90,
  allowSameDayBookings: true,
  cancellationPolicyNote: 'Cancellation and reschedule rules will be expanded in a later build.'
};

const emptyProcedure: ProcedureItem = { id: '', name: '', durationMinutes: 30, priceGuide: '', active: true, displayOrder: 100 };
const emptyPractitioner: PractitionerItem = { id: '', name: '', role: 'Dentist', active: true, displayOrder: 100, procedureIds: [] };
const dayLabels = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' }
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PracticeSettingsForm>(emptySettings);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [practitioners, setPractitioners] = useState<PractitionerItem[]>([]);
  const [procedureForm, setProcedureForm] = useState<ProcedureItem>(emptyProcedure);
  const [practitionerForm, setPractitionerForm] = useState<PractitionerItem>(emptyPractitioner);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Set up the practice details, booking rules, procedures and practitioners for this tenant.');
  const [error, setError] = useState('');

  const selectedWorkingDays = useMemo(() => new Set(settings.workingDays), [settings.workingDays]);

  useEffect(() => { void loadSettings(); }, []);

  function applyPayload(payload: SettingsPayload) {
    setSettings({ ...emptySettings, ...(payload.settings ?? {}) });
    setProcedures(Array.isArray(payload.procedures) ? payload.procedures : []);
    setPractitioners(Array.isArray(payload.practitioners) ? payload.practitioners : []);
  }

  async function loadSettings() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-settings', { cache: 'no-store', headers: makeAdminAuthHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not load settings.');
      applyPayload(payload as SettingsPayload);
      setMessage('Practice settings loaded.');
      showAdminToast('Practice settings loaded.', 'info');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...makeAdminAuthHeaders() },
        body: JSON.stringify({ settings })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not save settings.');
      applyPayload(payload as SettingsPayload);
      setMessage('Practice settings saved.');
      showAdminToast('Practice settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save settings.');
    } finally {
      setLoading(false);
    }
  }

  async function saveProcedure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...makeAdminAuthHeaders() },
        body: JSON.stringify({ ...procedureForm, type: 'procedure' })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not save procedure.');
      applyPayload(payload as SettingsPayload);
      setProcedureForm(emptyProcedure);
      showAdminToast(procedureForm.id ? 'Procedure updated.' : 'Procedure added.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save procedure.');
    } finally {
      setLoading(false);
    }
  }

  async function savePractitioner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...makeAdminAuthHeaders() },
        body: JSON.stringify({ ...practitionerForm, type: 'practitioner' })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not save practitioner.');
      applyPayload(payload as SettingsPayload);
      setPractitionerForm(emptyPractitioner);
      showAdminToast(practitionerForm.id ? 'Practitioner updated.' : 'Practitioner added.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save practitioner.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(type: 'procedure' | 'practitioner', id: string, label: string) {
    const confirmed = window.confirm(`Remove ${label}? If it has existing bookings it will be deactivated instead.`);
    if (!confirmed) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-settings?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: makeAdminAuthHeaders()
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `Could not remove ${type}.`);
      applyPayload(payload as SettingsPayload);
      showAdminToast(`${label} removed or deactivated.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Could not remove ${type}.`);
    } finally {
      setLoading(false);
    }
  }

  function toggleWorkingDay(day: number) {
    const next = new Set(settings.workingDays);
    if (next.has(day)) next.delete(day); else next.add(day);
    const days = Array.from(next).sort((a, b) => a - b);
    setSettings({ ...settings, workingDays: days.length ? days : settings.workingDays });
  }

  function togglePractitionerProcedure(procedureId: string) {
    const current = new Set(practitionerForm.procedureIds);
    if (current.has(procedureId)) current.delete(procedureId); else current.add(procedureId);
    setPractitionerForm({ ...practitionerForm, procedureIds: Array.from(current) });
  }

  return (
    <main className="shell fresh-shell admin-shell">
      <Header area="admin" />

      <section className="admin-command">
        <div>
          <p className="badge blue-badge">Practice settings · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Practice settings.</h1>
          <p className="hero-copy tight-copy">Set up this tenant’s practice details, working hours, booking rules, procedures and practitioners.</p>
        </div>
        <div className="command-actions admin-compact-actions">
          <button type="button" onClick={loadSettings} disabled={loading} className={`pill admin-busy-button admin-compact-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Refresh settings</button>
        </div>
      </section>

      {error && <section className="notice warning" role="alert">{error}</section>}
      {!error && message && <section className="notice soft" role="status">{message}</section>}

      <form className="card clean-panel practice-settings-panel" onSubmit={saveSettings}>
        <div className="section-heading-row compact-row">
          <div>
            <h2 className="section-title compact">Practice profile</h2>
            <p className="mini-copy">These values are the editable foundation for each future SaaS tenant.</p>
          </div>
          <button type="submit" disabled={loading} className={`button primary admin-busy-button admin-compact-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Save settings</button>
        </div>

        <div className="grid two controls-grid">
          <div className="form-row"><label>Practice name</label><input value={settings.practiceName} onChange={(event) => setSettings({ ...settings, practiceName: event.target.value })} /></div>
          <div className="form-row"><label>Public display name</label><input value={settings.publicDisplayName} onChange={(event) => setSettings({ ...settings, publicDisplayName: event.target.value })} /></div>
          <div className="form-row"><label>Practice email</label><input value={settings.email} onChange={(event) => setSettings({ ...settings, email: event.target.value })} /></div>
          <div className="form-row"><label>Practice phone</label><input value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} /></div>
          <div className="form-row span-two"><label>Address</label><textarea value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} /></div>
          <div className="form-row"><label>Logo URL placeholder</label><input value={settings.logoUrl} onChange={(event) => setSettings({ ...settings, logoUrl: event.target.value })} placeholder="Logo upload comes later" /></div>
          <div className="form-row"><label>Booking app URL</label><input value={settings.clientAppUrl ?? ''} readOnly /></div>
          <div className="form-row"><label>Timezone</label><input value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} /></div>
          <div className="form-row"><label>Currency</label><input value={settings.currencyCode} onChange={(event) => setSettings({ ...settings, currencyCode: event.target.value })} /></div>
          <div className="form-row"><label>Country</label><input value={settings.countryCode} onChange={(event) => setSettings({ ...settings, countryCode: event.target.value })} /></div>
          <div className="form-row"><label>Tenant slug</label><input value={settings.tenantSlug ?? ''} readOnly /></div>
        </div>

        <div className="settings-subpanel">
          <h3>Working hours foundation</h3>
          <div className="settings-toggle-row">
            {dayLabels.map((day) => <button key={day.value} type="button" className={selectedWorkingDays.has(day.value) ? 'selected' : ''} onClick={() => toggleWorkingDay(day.value)}>{day.label}</button>)}
          </div>
          <div className="grid four controls-grid">
            <div className="form-row"><label>Open from</label><input type="time" value={settings.workingStartTime} onChange={(event) => setSettings({ ...settings, workingStartTime: event.target.value })} /></div>
            <div className="form-row"><label>Open until</label><input type="time" value={settings.workingEndTime} onChange={(event) => setSettings({ ...settings, workingEndTime: event.target.value })} /></div>
            <label className="settings-checkbox"><input type="checkbox" checked={settings.lunchBreakEnabled} onChange={(event) => setSettings({ ...settings, lunchBreakEnabled: event.target.checked })} /> Lunch break</label>
            <div className="form-row"><label>Lunch start</label><input type="time" value={settings.lunchBreakStart} onChange={(event) => setSettings({ ...settings, lunchBreakStart: event.target.value })} /></div>
            <div className="form-row"><label>Lunch end</label><input type="time" value={settings.lunchBreakEnd} onChange={(event) => setSettings({ ...settings, lunchBreakEnd: event.target.value })} /></div>
          </div>
        </div>

        <div className="settings-subpanel">
          <h3>Booking rules foundation</h3>
          <div className="grid four controls-grid">
            <div className="form-row"><label>Slot interval</label><input type="number" min="5" max="120" value={settings.slotIntervalMinutes} onChange={(event) => setSettings({ ...settings, slotIntervalMinutes: Number(event.target.value) })} /></div>
            <div className="form-row"><label>Minimum notice hours</label><input type="number" min="0" value={settings.minimumNoticeHours} onChange={(event) => setSettings({ ...settings, minimumNoticeHours: Number(event.target.value) })} /></div>
            <div className="form-row"><label>Book ahead days</label><input type="number" min="1" value={settings.maxBookingAheadDays} onChange={(event) => setSettings({ ...settings, maxBookingAheadDays: Number(event.target.value) })} /></div>
            <label className="settings-checkbox"><input type="checkbox" checked={settings.allowSameDayBookings} onChange={(event) => setSettings({ ...settings, allowSameDayBookings: event.target.checked })} /> Allow same-day bookings</label>
            <div className="form-row span-two"><label>Cancellation/reschedule placeholder</label><textarea value={settings.cancellationPolicyNote} onChange={(event) => setSettings({ ...settings, cancellationPolicyNote: event.target.value })} /></div>
          </div>
        </div>
      </form>

      <section className="card clean-panel practice-settings-panel">
        <div className="section-heading-row compact-row"><div><h2 className="section-title compact">Procedures</h2><p className="mini-copy">Add/edit/delete procedure names, durations and billing placeholders.</p></div></div>
        <form className="settings-inline-form" onSubmit={saveProcedure}>
          <input value={procedureForm.name} onChange={(event) => setProcedureForm({ ...procedureForm, name: event.target.value })} placeholder="Procedure name" />
          <input type="number" min="5" value={procedureForm.durationMinutes} onChange={(event) => setProcedureForm({ ...procedureForm, durationMinutes: Number(event.target.value) })} placeholder="Minutes" />
          <input value={procedureForm.priceGuide} onChange={(event) => setProcedureForm({ ...procedureForm, priceGuide: event.target.value })} placeholder="Price/billing placeholder" />
          <input type="number" min="0" value={procedureForm.displayOrder} onChange={(event) => setProcedureForm({ ...procedureForm, displayOrder: Number(event.target.value) })} placeholder="Order" />
          <label className="settings-checkbox inline"><input type="checkbox" checked={procedureForm.active} onChange={(event) => setProcedureForm({ ...procedureForm, active: event.target.checked })} /> Active</label>
          <button type="submit" className="button primary admin-compact-button" disabled={loading}>{procedureForm.id ? 'Save procedure' : 'Add procedure'}</button>
          {procedureForm.id && <button type="button" className="pill" onClick={() => setProcedureForm(emptyProcedure)}>Cancel edit</button>}
        </form>
        <div className="settings-list compact-settings-list">
          {procedures.map((item) => <article key={item.id} className={!item.active ? 'inactive' : ''}><strong>{item.name}</strong><span>{item.durationMinutes} mins · {item.priceGuide || 'No price yet'}</span><button type="button" className="pill" onClick={() => setProcedureForm(item)}>Edit</button><button type="button" className="button danger admin-compact-button" onClick={() => deleteItem('procedure', item.id, item.name)}>Delete</button></article>)}
        </div>
      </section>

      <section className="card clean-panel practice-settings-panel">
        <div className="section-heading-row compact-row"><div><h2 className="section-title compact">Practitioners</h2><p className="mini-copy">Add/edit/delete dentists, hygienists and other team members. Procedure links are the foundation for capability rules.</p></div></div>
        <form className="settings-practitioner-form" onSubmit={savePractitioner}>
          <div className="grid four controls-grid">
            <input value={practitionerForm.name} onChange={(event) => setPractitionerForm({ ...practitionerForm, name: event.target.value })} placeholder="Practitioner name" />
            <input value={practitionerForm.role} onChange={(event) => setPractitionerForm({ ...practitionerForm, role: event.target.value })} placeholder="Role" />
            <input type="number" min="0" value={practitionerForm.displayOrder} onChange={(event) => setPractitionerForm({ ...practitionerForm, displayOrder: Number(event.target.value) })} placeholder="Order" />
            <label className="settings-checkbox"><input type="checkbox" checked={practitionerForm.active} onChange={(event) => setPractitionerForm({ ...practitionerForm, active: event.target.checked })} /> Active</label>
          </div>
          <div className="settings-toggle-row procedure-capability-row">
            {procedures.map((procedure) => <button key={procedure.id} type="button" className={practitionerForm.procedureIds.includes(procedure.id) ? 'selected' : ''} onClick={() => togglePractitionerProcedure(procedure.id)}>{procedure.name}</button>)}
          </div>
          <div className="admin-form-actions"><button type="submit" className="button primary admin-compact-button" disabled={loading}>{practitionerForm.id ? 'Save practitioner' : 'Add practitioner'}</button>{practitionerForm.id && <button type="button" className="pill" onClick={() => setPractitionerForm(emptyPractitioner)}>Cancel edit</button>}</div>
        </form>
        <div className="settings-list compact-settings-list">
          {practitioners.map((item) => <article key={item.id} className={!item.active ? 'inactive' : ''}><strong>{item.name}</strong><span>{item.role} · {item.procedureIds.length ? `${item.procedureIds.length} procedure link${item.procedureIds.length === 1 ? '' : 's'}` : 'No procedures linked'}</span><button type="button" className="pill" onClick={() => setPractitionerForm(item)}>Edit</button><button type="button" className="button danger admin-compact-button" onClick={() => deleteItem('practitioner', item.id, item.name)}>Delete</button></article>)}
        </div>
      </section>
    </main>
  );
}
