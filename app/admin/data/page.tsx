'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type AdminClient = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  bookingCount: number;
  familyMembers?: Array<{ id?: string; fullName: string; dateOfBirth?: string }>;
  documents?: Array<{ id?: string; fileName: string }>;
};

export default function AdminDataPage() {
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Search for a client, or add a new client record.');
  const [error, setError] = useState('');
  const [pastBookingCount, setPastBookingCount] = useState<number | null>(null);
  const [pastBookingBeforeDate, setPastBookingBeforeDate] = useState('');

  const authHeaders = makeAdminAuthHeaders();

  async function loadClients(nextQuery = query) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin-data/customers?query=${encodeURIComponent(nextQuery.trim())}`, {
        cache: 'no-store',
        headers: authHeaders
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not load clients.');
      const list = Array.isArray(payload.customers) ? payload.customers as AdminClient[] : [];
      setClients(list);
      const nextMessage = list.length ? `Loaded ${list.length} client record${list.length === 1 ? '' : 's'}.` : 'No clients found.';
      setMessage(nextMessage);
      showAdminToast(nextMessage, list.length ? 'info' : 'warning');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load clients.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadClients(query);
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
      showAdminToast(count ? `${count} past booking${count === 1 ? '' : 's'} found.` : 'No past bookings found.', 'info');
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'Could not check past bookings.');
    } finally {
      setLoading(false);
    }
  }

  async function deletePastBookings() {
    const confirmed = window.confirm('Remove all bookings before today for the demo? This keeps clients and future bookings, but the deleted past bookings cannot be restored from this tool.');
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
      setPastBookingCount(0);
      showAdminToast(`Removed ${deleted} past booking${deleted === 1 ? '' : 's'}.`);
      await loadClients(query);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove past bookings.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell fresh-shell admin-shell">
      <Header area="admin" />

      <section className="admin-command">
        <div>
          <p className="badge blue-badge">Clients · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Clients.</h1>
          <p className="hero-copy tight-copy">Search, add, edit and safely manage client records, family listings, documents, contact preferences and notes.</p>
        </div>
        <div className="command-actions">
          <Link className="pill" href="/admin">Back to diary</Link>
          <Link href="/admin/data/new" className="button primary large-cta">Add client</Link>
          <button type="button" onClick={() => loadClients()} disabled={loading} className={`button secondary large-cta admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Load clients</button>
        </div>
      </section>

      <section className="card clean-panel admin-data-panel clients-search-panel">
        <div className="grid two controls-grid">
          <div className="form-row">
            <label>Admin security</label>
            <div className="readonly-admin-security">Master key and staff login verified for this browser session.</div>
            <p className="micro-copy">All client adds, edits, deletes, password changes, document updates and family listing changes are recorded in the audit trail.</p>
          </div>
          <form className="form-row" onSubmit={handleSearch}>
            <label htmlFor="clientQuery">Search clients</label>
            <div className="inline-action-row">
              <input id="clientQuery" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Client or family member name, phone or email" />
              <button type="submit" disabled={loading} className={`pill admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Search</button>
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
            <p className="mini-copy">Remove old past bookings before a demo without deleting client records or future appointments.</p>
          </div>
          <div className="command-actions">
            <button type="button" onClick={checkPastBookings} disabled={loading} className={`pill admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Check past bookings</button>
            <button type="button" onClick={deletePastBookings} disabled={loading || pastBookingCount === 0} className={`button danger admin-busy-button ${loading ? 'is-loading' : ''}`}>{loading && <span className="admin-spinner" aria-hidden="true" />}Remove past bookings</button>
          </div>
        </div>
        <p className="micro-copy">
          {pastBookingCount === null ? 'This only targets bookings dated before today.' : `${pastBookingCount} past booking${pastBookingCount === 1 ? '' : 's'} before ${pastBookingBeforeDate || 'today'}.`}
        </p>
      </section>

      <section className="card clean-panel clients-results-panel">
        <div className="section-heading-row compact-row">
          <div>
            <h2 className="section-title compact">Search results</h2>
            <p className="mini-copy">One client per line. Searching a family member name opens the main client record.</p>
          </div>
        </div>

        <div className="clients-one-line-list">
          {clients.map((client) => (
            <Link key={client.id} className="client-one-line-row" href={`/admin/data/${encodeURIComponent(client.id)}`}>
              <strong>{client.fullName}</strong>
              <span>{client.phone}</span>
            </Link>
          ))}
          {!clients.length && <p className="mini-copy">No clients loaded yet. Search above or add a new client.</p>}
        </div>
      </section>
    </main>
  );
}
