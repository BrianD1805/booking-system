'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';

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
  const [adminKey, setAdminKey] = useState('');
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<EditingCustomer | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Enter the admin data key, then load customers.');
  const [error, setError] = useState('');

  const authHeaders: Record<string, string> = adminKey.trim() ? { 'x-zipbook-admin-key': adminKey.trim() } : {};

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
      setNewPassword('');
      setSelectedCustomer(payload.customer as AdminCustomer);
      setMessage('Password set for client login. Ask the client to change it once password-change is available.');
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
            <label htmlFor="adminDataKey">Admin data key</label>
            <input id="adminDataKey" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} placeholder="Enter protected key" />
            <p className="micro-copy">For local testing without an environment key, use zipbook-admin-dev.</p>
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
                <label htmlFor="newPassword">Set temporary client password</label>
                <input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimum 6 characters" />
                <p className="micro-copy">This is useful for accounts created before password login existed.</p>
              </div>
              <button className="pill" type="button" onClick={setPassword} disabled={loading || newPassword.length < 6}>Set password</button>

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
