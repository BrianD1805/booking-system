'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminToastHost, showAdminToast } from '@/components/admin/AdminToast';

type Staff = { id: string; fullName: string; email: string; role: string; active: boolean };

const MASTER_KEY_STORAGE = 'zipbook-admin-master-key';
const STAFF_TOKEN_STORAGE = 'zipbook-admin-staff-token';
const STAFF_PROFILE_STORAGE = 'zipbook-admin-staff-profile';

export function getStoredAdminAuth() {
  if (typeof window === 'undefined') return { masterKey: '', staffToken: '', staff: null as Staff | null };
  const staffJson = window.sessionStorage.getItem(STAFF_PROFILE_STORAGE) || '';
  let staff: Staff | null = null;
  try { staff = staffJson ? JSON.parse(staffJson) as Staff : null; } catch { staff = null; }
  return {
    masterKey: window.sessionStorage.getItem(MASTER_KEY_STORAGE) || '',
    staffToken: window.sessionStorage.getItem(STAFF_TOKEN_STORAGE) || '',
    staff
  };
}

export function makeAdminAuthHeaders() {
  const { masterKey, staffToken } = getStoredAdminAuth();
  return {
    ...(masterKey ? { 'x-zipbook-admin-key': masterKey } : {}),
    ...(staffToken ? { 'x-zipbook-staff-token': staffToken } : {})
  };
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [masterKey, setMasterKey] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [staff, setStaff] = useState<Staff | null>(null);
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Enter the master key, then sign in as a staff member.');
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdminUtility = useMemo(() => pathname?.startsWith('/admin/staff') || pathname?.startsWith('/admin/audit'), [pathname]);
  const adminMenuItems = useMemo(() => [
    { href: '/admin', label: 'Diary', helper: 'Daily slots and bookings' },
    { href: '/admin/reception', label: 'Add booking', helper: 'Reception booking flow' },
    { href: '/admin/data', label: 'Clients', helper: 'Search and manage clients' },
    { href: '/admin/staff', label: 'Staff', helper: 'Admin users and roles' },
    { href: '/admin/audit', label: 'Audit trail', helper: 'Changes and transactions' }
  ], []);

  useEffect(() => {
    const stored = getStoredAdminAuth();
    setMasterKey(stored.masterKey);
    setStaff(stored.staff);
    if (stored.masterKey) void checkStatus(stored.masterKey, stored.staffToken, false);
    else setChecking(false);
  }, []);

  async function checkStatus(nextMasterKey = masterKey, nextToken = getStoredAdminAuth().staffToken, showMessage = true) {
    setChecking(true);
    setError('');
    try {
      const response = await fetch('/api/admin-auth/staff/status', {
        cache: 'no-store',
        headers: {
          ...(nextMasterKey ? { 'x-zipbook-admin-key': nextMasterKey } : {}),
          ...(nextToken ? { 'x-zipbook-staff-token': nextToken } : {})
        }
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Admin status check failed.');
      setStaffCount(Number(payload.staffCount ?? 0));
      if (payload.staff) {
        setStaff(payload.staff as Staff);
        window.sessionStorage.setItem(STAFF_PROFILE_STORAGE, JSON.stringify(payload.staff));
      } else if (showMessage) {
        setMessage(Number(payload.staffCount ?? 0) > 0 ? 'Master key accepted. Now sign in as a staff member.' : 'Master key accepted. Create the first staff login below.');
      }
      window.sessionStorage.setItem(MASTER_KEY_STORAGE, nextMasterKey);
    } catch (statusError) {
      setStaff(null);
      window.sessionStorage.removeItem(STAFF_TOKEN_STORAGE);
      window.sessionStorage.removeItem(STAFF_PROFILE_STORAGE);
      setError(statusError instanceof Error ? statusError.message : 'Could not check admin login.');
    } finally {
      setChecking(false);
    }
  }

  async function handleMasterKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await checkStatus(masterKey.trim(), '', true);
  }

  async function handleStaffLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-zipbook-admin-key': masterKey.trim() },
        body: JSON.stringify({ email: staffEmail, password: staffPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Staff login failed.');
      window.sessionStorage.setItem(MASTER_KEY_STORAGE, masterKey.trim());
      window.sessionStorage.setItem(STAFF_TOKEN_STORAGE, String(payload.sessionToken ?? ''));
      window.sessionStorage.setItem(STAFF_PROFILE_STORAGE, JSON.stringify(payload.staff));
      setStaff(payload.staff as Staff);
      setMessage(`Signed in as ${payload.staff?.fullName ?? 'staff member'}.`);
      showAdminToast(`Signed in as ${payload.staff?.fullName ?? 'staff member'}.`);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Staff login failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFirstStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin-auth/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-zipbook-admin-key': masterKey.trim() },
        body: JSON.stringify({ fullName: setupName, email: setupEmail, phone: setupPhone, role: 'Admin / Reception', password: setupPassword, active: true })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not create first staff login.');
      setStaffCount(1);
      setStaffEmail(String(payload.staff?.email ?? setupEmail));
      setMessage('First staff login created. Now sign in with that staff email and password.');
      showAdminToast('First staff login created.');
      setSetupPassword('');
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Could not create first staff login.');
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    window.sessionStorage.removeItem(STAFF_TOKEN_STORAGE);
    window.sessionStorage.removeItem(STAFF_PROFILE_STORAGE);
    setStaff(null);
    setStaffPassword('');
    setMessage('Staff signed out. Master key is still stored for this browser session.');
    showAdminToast('Staff signed out.', 'info');
  }

  if (checking) {
    return <><AdminToastHost /><main className="shell fresh-shell admin-shell"><section className="card clean-panel"><p className="badge blue-badge">Admin security</p><h1 className="section-title">Checking admin login…</h1></section></main></>;
  }

  if (!staff) {
    return (
      <>
      <AdminToastHost />
      <main className="shell fresh-shell admin-shell">
        <section className="admin-login-shell card clean-panel">
          <p className="badge blue-badge">Admin security · two-step login</p>
          <h1 className="hero-title clean-title">Staff login.</h1>
          <p className="hero-copy tight-copy">Enter the master admin key first, then sign in as the staff member using the admin system.</p>

          {error && <div className="notice warning" role="alert">{error}</div>}
          {!error && message && <div className="notice soft" role="status">{message}</div>}

          <form className="admin-login-card" onSubmit={handleMasterKey}>
            <h2>1. Master key</h2>
            <div className="inline-action-row">
              <input type="password" value={masterKey} onChange={(event) => setMasterKey(event.target.value)} placeholder="Master admin key" />
              <button className="button primary" type="submit" disabled={loading}>Unlock</button>
            </div>
            <p className="micro-copy">Local testing fallback is zipbook-admin-dev when no live environment key is configured.</p>
          </form>

          {staffCount === 0 && (
            <form className="admin-login-card" onSubmit={handleFirstStaff}>
              <h2>2. Create first staff login</h2>
              <div className="grid two controls-grid">
                <input value={setupName} onChange={(event) => setSetupName(event.target.value)} placeholder="Full name" />
                <input value={setupEmail} onChange={(event) => setSetupEmail(event.target.value)} placeholder="Email address" />
                <input value={setupPhone} onChange={(event) => setSetupPhone(event.target.value)} placeholder="Phone number" />
                <input type="password" value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} placeholder="Password" />
              </div>
              <button className="button primary" type="submit" disabled={loading || !masterKey.trim()}>Create first staff login</button>
            </form>
          )}

          {(staffCount ?? 0) > 0 && (
            <form className="admin-login-card" onSubmit={handleStaffLogin}>
              <h2>2. Staff login</h2>
              <div className="grid two controls-grid">
                <input value={staffEmail} onChange={(event) => setStaffEmail(event.target.value)} placeholder="Staff email" />
                <input type="password" value={staffPassword} onChange={(event) => setStaffPassword(event.target.value)} placeholder="Staff password" />
              </div>
              <button className="button primary" type="submit" disabled={loading || !masterKey.trim()}>Sign in to admin</button>
            </form>
          )}
        </section>
      </main>
      </>
    );
  }

  return (
    <>
      <AdminToastHost />
      <div className="admin-staff-bar">
        <div className="admin-staff-identity">
          <span>Signed in</span>
          <strong>{staff.fullName}</strong>
          <small>{staff.role}</small>
        </div>
        <div className="admin-mega-menu-wrap">
          <button
            className="admin-mega-trigger"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="adminMegaMenu"
          >
            ☰ Admin menu
          </button>
          {menuOpen && (
            <div id="adminMegaMenu" className="admin-mega-menu" role="menu">
              <div className="admin-mega-menu-head">
                <strong>ZipBook Admin</strong>
                <span>One clean menu for diary, reception, clients and practice tools.</span>
              </div>
              <div className="admin-mega-menu-grid">
                {adminMenuItems.map((item) => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
                  return (
                    <a key={item.href} href={item.href} className={active ? 'active' : ''} role="menuitem" onClick={() => setMenuOpen(false)}>
                      <strong>{item.label}</strong>
                      <span>{item.helper}</span>
                    </a>
                  );
                })}
              </div>
              <button type="button" className="admin-mega-signout" onClick={() => { setMenuOpen(false); signOut(); }}>Staff sign out</button>
            </div>
          )}
        </div>
      </div>
      {isAdminUtility ? children : children}
    </>
  );
}
