'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';

type AdminCustomer = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  notes?: string;
  hasClientLogin: boolean;
  loginPhone?: string;
  loginEmail?: string;
  verifiedAt?: string;
  passwordSet: boolean;
  bookingCount: number;
  latestBookingDate?: string;
  createdAt: string;
  updatedAt: string;
};

type EditingCustomer = Pick<AdminCustomer, 'id' | 'fullName' | 'phone' | 'email' | 'notes'>;

export default function AdminDataPage() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<EditingCustomer | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Enter the admin data key, then load customers.');
  const [error, setError] = useState('');
  const [pastBookingCount, setPastBookingCount] = useState<number | null>(null);
  const [pastBookingBeforeDate, setPastBookingBeforeDate] = useState('');

  const authHeaders = makeAdminAuthHeaders();

  async function loadCustomers(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers?query=${encodeURIComponent(nextQuery.trim())}`, {
        cache: 'no-store',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not load customers.');
      const list = Array.isArray(payload.customers) ? payload.customers as AdminCustomer[] : [];
      setCustomers(list);
      setMessage(list.length ? `Loaded ${list.length} customer record${list.length === 1 ? '' : 's'}.` : 'No customers found.');
      if (selectedCustomer && !list.some((customer) => customer.id === selectedCustomer.id)) {
        setSelectedCustomer(null);
        setEditingCustomer(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }

  function selectCustomer(customer: AdminCustomer) {
    setSelectedCustomer(customer);
    setEditingCustomer({
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes ?? ''
    });
    setNewPassword('');
    setMessage(`${customer.fullName} selected.`);
  }

  async function checkPastBookings() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-data/bookings/past', {
        cache: 'no-store',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not check past bookings.');
      const count = Number(payload.summary?.pastBookingCount ?? 0);
      const beforeDate = String(payload.summary?.beforeDate ?? 'today');
      setPastBookingCount(count);
      setPastBookingBeforeDate(beforeDate);
      setMessage(count ? `${count} past booking${count === 1 ? '' : 's'} found before ${beforeDate}.` : `No past bookings found before ${beforeDate}.`);
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Could not check past bookings.');
    } finally {
      setLoading(false);
    }
  }

  async function deletePastBookings() {
    const confirmed = window.confirm('Remove all bookings before today for the demo? This keeps customers and future bookings, but the deleted past bookings cannot be restored from this tool.');
    if (!confirmed) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-data/bookings/past?confirm=DELETE', {
        method: 'DELETE',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not remove past bookings.');
      const deleted = Number(payload.result?.deletedBookings ?? 0);
      const beforeDate = String(payload.result?.beforeDate ?? 'today');
      setPastBookingCount(0);
      setPastBookingBeforeDate(beforeDate);
      setMessage(`Removed ${deleted} past booking${deleted === 1 ? '' : 's'} before ${beforeDate}. Customers and future bookings were left untouched.`);
      await loadCustomers(query);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove past bookings.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadCustomers(query);
  }

  async function saveCustomer() {
    if (!editingCustomer) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers/${encodeURIComponent(editingCustomer.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(editingCustomer)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not update customer.');
      const customer = payload.customer as AdminCustomer;
      setSelectedCustomer(customer);
      setEditingCustomer({ id: customer.id, fullName: customer.fullName, phone: customer.phone, email: customer.email, notes: customer.notes ?? '' });
      setMessage('Customer updated.');
      await loadCustomers(query);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update customer.');
    } finally {
      setLoading(false);
    }
  }

  async function setPassword() {
    if (!selectedCustomer || !newPassword) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers/${encodeURIComponent(selectedCustomer.id)}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ password: newPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not set password.');
      const customer = payload.customer as AdminCustomer;
      setNewPassword('');
      setSelectedCustomer(customer);
      setEditingCustomer({ id: customer.id, fullName: customer.fullName, phone: customer.phone, email: customer.email, notes: customer.notes ?? '' });
      setCustomers((current) => current.map((item) => item.id === customer.id ? customer : item));
      setMessage(`Password saved for ${customer.fullName}. Status: password set.`);
      await loadCustomers(query);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Could not set password.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteCustomer() {
    if (!selectedCustomer) return;
    const confirmed = window.confirm(`Delete ${selectedCustomer.fullName}, their client login, sessions, OTPs and linked bookings? This cannot be undone.`);
    if (!confirmed) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers/${encodeURIComponent(selectedCustomer.id)}?confirm=DELETE`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not delete customer.');
      setSelectedCustomer(null);
      setEditingCustomer(null);
      setMessage(`Deleted customer data. Bookings removed: ${payload.result?.deletedBookings ?? 0}.`);
      await loadCustomers(query);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete customer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell fresh-shell admin-shell">
      <Header area="admin" />

      <section className="admin-command">
        <div>
          <p className="badge blue-badge">Protected admin data tool · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Customer data.</h1>
          <p className="hero-copy tight-copy">View customer records, fix contact details, set a temporary client password, or remove test customers with their linked bookings.</p>
        </div>
        <div className="command-actions">
          <Link className="pill" href="/admin">Back to diary</Link>
          <button className="button primary large-cta" type="button" onClick={() => loadCustomers()} disabled={loading}>Load customers</button>
        </div>
      </section>

      <section className="card clean-panel admin-data-panel">
        <div className="grid two controls-grid">
          <div className="form-row">
            <label>Admin security</label>
            <div className="readonly-admin-security">Master key and staff login verified for this browser session.</div>
            <p className="micro-copy">Customer edits and deletes are now recorded against the signed-in staff member.</p>
          </div>
          <form className="form-row" onSubmit={handleSearch}>
            <label htmlFor="customerQuery">Search customers</label>
            <div className="inline-action-row">
              <input id="customerQuery" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, phone or email" />
              <button className="pill" type="submit" disabled={loading}>Search</button>
            </div>
          </form>
        </div>

        {error && <div className="notice warning" role="alert">{error}</div>}
        {!error && message && <div className="notice soft" role="status">{message}</div>}
      </section>

      <section className="card clean-panel admin-data-panel">
        <div className="section-heading-row compact-row">
          <div>
            <h2 className="section-title compact">Demo cleanup</h2>
            <p className="mini-copy">Remove old past bookings before a demo without deleting customer records or future appointments.</p>
          </div>
          <div className="command-actions">
            <button className="pill" type="button" onClick={checkPastBookings} disabled={loading}>Check past bookings</button>
            <button className="button danger" type="button" onClick={deletePastBookings} disabled={loading || pastBookingCount === 0}>Remove past bookings</button>
          </div>
        </div>
        <p className="micro-copy">
          {pastBookingCount === null
            ? 'This only targets bookings dated before today. It does not remove today, future bookings, customers, client logins, sessions or OTP records.'
            : `${pastBookingCount} past booking${pastBookingCount === 1 ? '' : 's'} before ${pastBookingBeforeDate || 'today'}.`}
        </p>
      </section>

      <section className="admin-data-grid">
        <div className="card clean-panel">
          <div className="section-heading-row compact-row">
            <div>
              <h2 className="section-title compact">Customers</h2>
              <p className="mini-copy">Showing up to 50 records. Use search for older records.</p>
            </div>
          </div>

          <div className="customer-data-list">
            {customers.map((customer) => (
              <button key={customer.id} className={`customer-data-card ${selectedCustomer?.id === customer.id ? 'selected' : ''}`} type="button" onClick={() => selectCustomer(customer)}>
                <strong>{customer.fullName}</strong>
                <span>{customer.phone} · {customer.email}</span>
                <small>{customer.bookingCount} booking{customer.bookingCount === 1 ? '' : 's'} · {customer.passwordSet ? 'Password set' : 'No password'} · {customer.hasClientLogin ? 'Client login' : 'Guest/admin record'}</small>
              </button>
            ))}
            {!customers.length && <p className="mini-copy">No customer rows loaded yet.</p>}
          </div>
        </div>

        <div className="card clean-panel">
          <div className="section-heading-row compact-row">
            <div>
              <h2 className="section-title compact">Edit selected customer</h2>
              <p className="mini-copy">Use this for quick corrections. Keep full international phone numbers where possible.</p>
            </div>
          </div>

          {editingCustomer ? (
            <div className="admin-data-editor">
              <div className="form-row">
                <label htmlFor="editFullName">Full name</label>
                <input id="editFullName" value={editingCustomer.fullName} onChange={(event) => setEditingCustomer({ ...editingCustomer, fullName: event.target.value })} />
              </div>
              <div className="form-row">
                <label htmlFor="editPhone">Phone</label>
                <input id="editPhone" value={editingCustomer.phone} onChange={(event) => setEditingCustomer({ ...editingCustomer, phone: event.target.value })} />
              </div>
              <div className="form-row">
                <label htmlFor="editEmail">Email</label>
                <input id="editEmail" type="email" value={editingCustomer.email} onChange={(event) => setEditingCustomer({ ...editingCustomer, email: event.target.value })} />
              </div>
              <div className="form-row">
                <label htmlFor="editNotes">Notes</label>
                <textarea id="editNotes" value={editingCustomer.notes ?? ''} onChange={(event) => setEditingCustomer({ ...editingCustomer, notes: event.target.value })} rows={3} />
              </div>
              <button className="button primary" type="button" onClick={saveCustomer} disabled={loading}>Save customer</button>

              <div className="admin-data-divider" />

              <div className="form-row">
                <label htmlFor="newPassword">Set / reset client password</label>
                <input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimum 6 characters" autoComplete="new-password" />
                <p className="micro-copy">Current status: <strong>{selectedCustomer?.passwordSet ? 'Password set' : 'No password yet'}</strong>. The customer phone will be stored as the login number.</p>
              </div>
              <button className="button primary" type="button" onClick={setPassword} disabled={loading || newPassword.length < 6}>{loading ? 'Saving...' : selectedCustomer?.passwordSet ? 'Reset password' : 'Save password'}</button>

              <div className="admin-data-divider" />

              <button className="button danger" type="button" onClick={deleteCustomer} disabled={loading}>Delete customer and linked bookings</button>
            </div>
          ) : (
            <p className="mini-copy">Select a customer from the list to edit their record.</p>
          )}
        </div>
      </section>
    </main>
  );
}
