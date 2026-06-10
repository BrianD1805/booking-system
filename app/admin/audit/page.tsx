'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';
import { makeAdminAuthHeaders } from '@/components/admin/AdminAuthGate';
import { showAdminToast } from '@/components/admin/AdminToast';

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  source: string;
  staffName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

function formatAction(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminAuditPage() {
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { void loadAudit(); }, []);

  async function loadAudit() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-auth/audit?limit=150', { cache: 'no-store', headers: makeAdminAuthHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not load audit trail.');
      setAudit(Array.isArray(payload.audit) ? payload.audit as AuditLog[] : []);
      showAdminToast('Audit trail refreshed.', 'info');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load audit trail.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell fresh-shell admin-shell">
      <Header area="admin" />
      <section className="admin-command">
        <div>
          <p className="badge blue-badge">Audit trail · {APP_VERSION}</p>
          <h1 className="hero-title clean-title">Admin activity.</h1>
          <p className="hero-copy tight-copy">Bookings, client changes, staff changes and admin transactions are recorded here with the signed-in staff identity where available.</p>
        </div>
        <div className="command-actions">
          <Link className="pill" href="/admin">Back to diary</Link>
          <button type="button" onClick={loadAudit} disabled={loading} className={`button primary large-cta admin-action-button ${loading ? 'is-loading' : ''}`}><span className="refresh-icon" aria-hidden="true">↻</span>{loading ? 'Refreshing…' : 'Refresh audit'}</button>
        </div>
      </section>

      <section className="card clean-panel audit-panel">
        {error && <div className="notice warning" role="alert">{error}</div>}
        <div className="audit-list">
          {audit.map((item) => (
            <article key={item.id} className="audit-row">
              <div>
                <strong>{formatAction(item.action)}</strong>
                <span>{new Date(item.createdAt).toLocaleString()} · {item.staffName || item.source || 'System'} · {item.entityType}{item.entityId ? ` · ${item.entityId}` : ''}</span>
              </div>
              <code>{JSON.stringify(item.details ?? {})}</code>
            </article>
          ))}
          {!audit.length && !error && <p className="mini-copy">No audit records loaded yet.</p>}
        </div>
      </section>
    </main>
  );
}
