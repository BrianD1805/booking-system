'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';

type Staff = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  lastLoginAt?: string;
};

type StaffForm = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  password: string;
};

const emptyForm: StaffForm = { fullName: '', email: '', phone: '', role: 'Reception', active: true, password: '' };

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Manage the staff accounts allowed to use the admin system after the master key gate.');
  const [error, setError] = useState('');

  useEffect(() => { void loadStaff(); }, []);

  async function loadStaff() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-auth/staff', { cache: 'no-store', headers: makeAdminAuthHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not load staff.');
      setStaff(Array.isArray(payload.staff) ? payload.staff as Staff[] : []);
      setMessage('Staff list loaded.');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load staff.');
    } finally {
      setLoading(false);
    }
  }

  function editStaff(item: Staff) {
    setForm({ id: item.id, fullName: item.fullName, email: item.email, phone: item.phone ?? '', role: item.role, active: item.active, password: '' });
    setMessage(`Editing ${item.fullName}. Leave password blank to keep the current password.`);
  }

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const editing = Boolean(form.id);
      const response = await fetch(editing ? `/api/admin-auth/staff/${encodeURIComponent(form.id ?? '')}` : '/api/admin-auth/staff', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', ...makeAdminAuthHeaders() },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not save staff member.');
      setForm(emptyForm);
      setMessage(editing ? 'Staff member updated.' : 'Staff member added.');
      await loadStaff();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save staff member.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteStaff(item: Staff) {
    const confirmed = window.confirm(`Delete staff login for ${item.fullName}? This cannot be undone.`);
    if (!confirmed) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-auth/staff/${encodeURIComponent(item.id)}?confirm=DELETE`, {
        method: 'DELETE',
        headers: makeAdminAuthHeaders()
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not delete staff member.');
      setMessage(`${item.fullName} deleted.`);
      if (form.id === item.id) setForm(emptyForm);
      await loadStaff();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete staff member.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell fresh-shell admin-shell">
      <Header area="admin" />
      <section className="admin-command">
        <div>
          <p className="badge blue-badge">Staff security · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Staff logins.</h1>
          <p className="hero-copy tight-copy">Add, edit or remove the reception/admin staff who can use ZipBook after the master key has unlocked the admin system.</p>
        </div>
        <div className="command-actions">
          <Link className="pill" href="/admin">Back to diary</Link>
          <button className="button primary large-cta" type="button" onClick={loadStaff} disabled={loading}>Refresh staff</button>
        </div>
      </section>

      <section className="card clean-panel admin-staff-manager">
        {error && <div className="notice warning" role="alert">{error}</div>}
        {!error && message && <div className="notice soft" role="status">{message}</div>}

        <form className="staff-edit-form" onSubmit={saveStaff}>
          <div className="section-heading-row compact-row">
            <div>
              <h2 className="section-title compact">{form.id ? 'Edit staff member' : 'Add staff member'}</h2>
              <p className="mini-copy">Passwords are stored hashed. Leave password blank when editing unless you want to replace it.</p>
            </div>
            {form.id && <button className="pill" type="button" onClick={() => setForm(emptyForm)}>Cancel edit</button>}
          </div>
          <div className="grid two controls-grid">
            <div className="form-row"><label>Full name</label><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></div>
            <div className="form-row"><label>Email</label><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div className="form-row"><label>Phone</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div className="form-row"><label>Role</label><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} /></div>
            <div className="form-row"><label>{form.id ? 'New password (optional)' : 'Password'}</label><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>
            <label className="staff-active-toggle"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Active staff login</label>
          </div>
          <button className="button primary" type="submit" disabled={loading}>{form.id ? 'Save staff changes' : 'Add staff member'}</button>
        </form>
      </section>

      <section className="card clean-panel admin-staff-manager">
        <div className="section-heading-row compact-row"><h2 className="section-title compact">Current staff</h2></div>
        <div className="staff-list">
          {staff.map((item) => (
            <article key={item.id} className="staff-row">
              <div><strong>{item.fullName}</strong><span>{item.email} · {item.role}</span></div>
              <span className={item.active ? 'staff-status active' : 'staff-status inactive'}>{item.active ? 'Active' : 'Inactive'}</span>
              <button className="pill" type="button" onClick={() => editStaff(item)}>Edit</button>
              <button className="button danger" type="button" onClick={() => deleteStaff(item)} disabled={loading}>Delete</button>
            </article>
          ))}
          {!staff.length && <p className="mini-copy">No staff records loaded yet.</p>}
        </div>
      </section>
    </main>
  );
}
