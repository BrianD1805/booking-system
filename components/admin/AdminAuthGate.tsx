'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminToastHost, showAdminToast } from '@/components/admin/AdminToast';
import { APP_VERSION } from '@/lib/mockData';

type Staff = { id: string; fullName: string; email: string; role: string; active: boolean };

const MASTER_KEY_STORAGE = 'zipbook-admin-master-key';
const STAFF_TOKEN_STORAGE = 'zipbook-admin-staff-token';
const STAFF_PROFILE_STORAGE = 'zipbook-admin-staff-profile';
function canUseAdminSessionStorage() {
  try {
    const key = 'zipbook-session-check';
    window.sessionStorage.setItem(key, '1');
    window.sessionStorage.removeItem(key);
    return true;
  } catch { return false; }
}
function adminSessionSet(key: string, value: string) {
  try { window.sessionStorage.setItem(key, value); } catch { /* Embedded browser may block storage. */ }
}
function adminSessionRemove(key: string) {
  try { window.sessionStorage.removeItem(key); } catch { /* Embedded browser may block storage. */ }
}

export function getStoredAdminAuth() {
  if (typeof window === 'undefined') return { masterKey: '', staffToken: '', staff: null as Staff | null };
  let staffJson = '';
  let storedMasterKey = '';
  let storedStaffToken = '';
  try {
    staffJson = window.sessionStorage.getItem(STAFF_PROFILE_STORAGE) || '';
    storedMasterKey = window.sessionStorage.getItem(MASTER_KEY_STORAGE) || '';
    storedStaffToken = window.sessionStorage.getItem(STAFF_TOKEN_STORAGE) || '';
  } catch { /* Third-party frame storage may be restricted; use the full-page diary link. */ }
  let staff: Staff | null = null;
  try { staff = staffJson ? JSON.parse(staffJson) as Staff : null; } catch { staff = null; }
  return {
    masterKey: storedMasterKey,
    staffToken: storedStaffToken,
    staff
  };
}

export function makeAdminAuthHeaders(): Record<string, string> {
  const { masterKey, staffToken } = getStoredAdminAuth();
  const headers: Record<string, string> = {};
  if (masterKey) headers['x-zipbook-admin-key'] = masterKey;
  if (staffToken) headers['x-zipbook-staff-token'] = staffToken;
  return headers;
}


function AdminPasswordEyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg className="admin-password-eye-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path className="admin-password-eye-outline" d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12Z" />
      <circle className="admin-password-eye-pupil" cx="12" cy="12" r="2.7" />
      {hidden && <path className="admin-password-eye-slash" d="M4.5 4.5l15 15" />}
    </svg>
  );
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [business, setBusiness] = useState<{name:string;legacy:boolean} | null>(null);
  const [embedded, setEmbedded] = useState(false);
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
  const [message, setMessage] = useState('Enter the master admin key to continue.');
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(true);
  const [showSetupPassword, setShowSetupPassword] = useState(true);

  const isAdminUtility = useMemo(() => pathname?.startsWith('/admin/staff') || pathname?.startsWith('/admin/audit'), [pathname]);
  const adminMenuItems = useMemo(() => [
    { href: '/admin', label: 'Diary', helper: 'Daily slots and bookings' },
    { href: '/admin/reception', label: 'Add booking', helper: 'Reception booking flow' },
    { href: '/admin/data', label: 'Clients', helper: 'Search and manage clients' },
    { href: '/admin/settings', label: 'Settings', helper: 'Practice setup and booking rules' },
    { href: '/admin/integrations', label: 'Website integration', helper: 'HTML snippets, links and approved websites' },
    { href: '/admin/staff', label: 'Staff', helper: 'Admin users and roles' },
    { href: '/admin/audit', label: 'Audit trail', helper: 'Changes and transactions' }
  ], []);

  useEffect(() => {
    try { setEmbedded(window.self !== window.top); } catch { setEmbedded(true); }
    const stored = getStoredAdminAuth();
    void (async () => {
      try {
        const response = await fetch('/api/tenant-context', {cache:'no-store'});
        const payload = await response.json();
        if (!response.ok || !payload.tenant) throw new Error(payload.error || 'Business is unavailable.');
        const resolved = payload.tenant as {name:string;legacy:boolean};
        setBusiness(resolved);
        setMasterKey(resolved.legacy ? stored.masterKey : '');
        if (!resolved.legacy || stored.masterKey) await checkStatus(resolved.legacy ? stored.masterKey : '', stored.staffToken, false, resolved.legacy);
        else {
          // A verified 15-minute public demo visitor needs no master key.
          const demoResponse=await fetch('/api/demo/session',{cache:'no-store'}).catch(()=>null);
          const demo=demoResponse?.ok?await demoResponse.json().catch(()=>null):null;
          if(demo?.active && demo.realDemo) await checkStatus('', '', false, true);
          else setChecking(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Business is unavailable.');
        setChecking(false);
      }
    })();
  }, []);

  async function checkStatus(nextMasterKey = masterKey, nextToken = getStoredAdminAuth().staffToken, showMessage = true, legacy = business?.legacy !== false) {
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
        adminSessionSet(STAFF_PROFILE_STORAGE, JSON.stringify(payload.staff));
      } else {
        setStaff(null);
        adminSessionRemove(STAFF_PROFILE_STORAGE);
        adminSessionRemove(STAFF_TOKEN_STORAGE);
        const nextMessage = !legacy ? 'Sign in with your business staff email and password.' : Number(payload.staffCount ?? 0) > 0 ? 'Master key accepted. Now sign in as a staff member.' : 'Master key accepted. Create the first staff login below.';
        if (showMessage || nextMasterKey || !legacy) setMessage(nextMessage);
      }
      adminSessionSet(MASTER_KEY_STORAGE, nextMasterKey);
    } catch (statusError) {
      setStaff(null);
      setStaffCount(null);
      adminSessionRemove(MASTER_KEY_STORAGE);
      adminSessionRemove(STAFF_TOKEN_STORAGE);
      adminSessionRemove(STAFF_PROFILE_STORAGE);
      setError(statusError instanceof Error ? statusError.message : 'Could not check admin login.');
    } finally {
      setChecking(false);
    }
  }

  async function handleMasterKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMasterKey = masterKey.trim();
    if (!trimmedMasterKey) {
      setStaffCount(null);
      setError('Enter the master admin key.');
      return;
    }
    setMasterKey(trimmedMasterKey);
    await checkStatus(trimmedMasterKey, '', true);
  }

  function returnToMasterKey() {
    setStaffCount(null);
    setStaffPassword('');
    setSetupPassword('');
    setError('');
    setMessage('Enter the master admin key to continue.');
  }

  async function handleStaffLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    if (!canUseAdminSessionStorage()) {
      setError('This browser blocks staff login storage inside this website. Open the secure diary in a new tab to sign in.');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/admin-auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-zipbook-admin-key': masterKey.trim() },
        body: JSON.stringify({ email: staffEmail, password: staffPassword })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Staff login failed.');
      adminSessionSet(MASTER_KEY_STORAGE, masterKey.trim());
      adminSessionSet(STAFF_TOKEN_STORAGE, String(payload.sessionToken ?? ''));
      adminSessionSet(STAFF_PROFILE_STORAGE, JSON.stringify(payload.staff));
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
    if(staff?.role==='Demo / Reception') {
      void fetch('/api/demo/logout', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})
        .finally(()=>{window.location.assign(window.location.hostname==='localhost' ? '/demo' : 'https://zipbook.app/demo');});
      setStaff(null);
      return;
    }
    void fetch('/api/admin-auth/staff/logout', {method:'POST',headers:makeAdminAuthHeaders()}).catch(()=>undefined);
    adminSessionRemove(STAFF_TOKEN_STORAGE);
    adminSessionRemove(STAFF_PROFILE_STORAGE);
    setStaff(null);
    setStaffPassword('');
    setMessage(business?.legacy ? 'Staff signed out. Master key is still stored for this browser session.' : 'Staff signed out.');
    showAdminToast('Staff signed out.', 'info');
  }

  if (checking) {
    return <><AdminToastHost /><main className="shell fresh-shell admin-shell"><section className="card clean-panel"><p className="badge blue-badge">Admin security</p><h1 className="section-title">Checking admin login…</h1></section></main></>;
  }

  if (!business) return <main className="shell fresh-shell admin-shell"><section className="card clean-panel"><h1 className="section-title">Business unavailable</h1><p>{error || 'Please check your business address.'}</p></section></main>;
  if (staff?.role==='Demo / Reception' && !['/admin','/admin/reception','/admin/data'].includes(pathname || '')) {
    return <><AdminToastHost/><main className="shell fresh-shell admin-shell"><section className="card clean-panel"><p className="badge blue-badge">Public demo · restricted access</p><h1 className="section-title">Protected settings are not available to visitors.</h1><p>The actual diary, reception flow and fictional client search are available. Staff, security, practice settings and integrations stay owner-only.</p><a className="button primary" href="/admin">Return to the Practice Diary</a></section></main></>;
  }
  if (!staff) {
    const masterKeyScreen = business.legacy && staffCount === null;
    const firstStaffScreen = business.legacy && staffCount === 0;
    const staffLoginScreen = !business.legacy || (staffCount ?? 0) > 0;

    return (
      <>
      <AdminToastHost />
      <main className="shell fresh-shell admin-shell">
        <section className="admin-login-shell card clean-panel">
          <p className="badge blue-badge">Admin security</p>

          {masterKeyScreen && (
            <div className="admin-login-screen admin-master-key-screen">
              <h1 className="hero-title clean-title admin-master-login-title">Master key.</h1>
              <p className="hero-copy tight-copy">Enter the master admin key first. Staff login opens on the next screen.</p>

              {error && <div className="notice warning" role="alert">{error}</div>}
              {!error && message && <div className="notice soft" role="status">{message}</div>}

              <form className="admin-login-card" onSubmit={handleMasterKey}>
                <h2>1. Master key</h2>
                <div className="inline-action-row admin-master-key-row">
                  <div className="admin-password-control">
                    <input
                      type={showMasterKey ? 'text' : 'password'}
                      value={masterKey}
                      onChange={(event) => setMasterKey(event.target.value)}
                      placeholder="Master admin key"
                      aria-label="Master admin key"
                    />
                    <button
                      className="admin-password-eye"
                      type="button"
                      onClick={() => setShowMasterKey((visible) => !visible)}
                      aria-label={showMasterKey ? 'Hide master key' : 'Show master key'}
                    >
                      <AdminPasswordEyeIcon hidden={!showMasterKey} />
                    </button>
                  </div>
                  <button className="button primary" type="submit" disabled={loading}>Unlock</button>
                </div>
              </form>
            </div>
          )}

          {firstStaffScreen && (
            <div className="admin-login-screen admin-first-staff-screen">
              <div className="admin-login-screen-head">
                <div>
                  <h1 className="hero-title clean-title admin-staff-login-title">Create first staff login.</h1>
                  <p className="hero-copy tight-copy">Master key accepted. Create the first staff login on this screen.</p>
                </div>
                {business.legacy && <button className="button ghost admin-master-back" type="button" onClick={returnToMasterKey}>Change master key</button>}
              </div>

              {error && <div className="notice warning" role="alert">{error}</div>}
              {!error && message && <div className="notice soft" role="status">{message}</div>}

              <form className="admin-login-card admin-staff-login-card" onSubmit={handleFirstStaff}>
                <h2>2. Create first staff login</h2>
                <div className="grid two controls-grid">
                  <input value={setupName} onChange={(event) => setSetupName(event.target.value)} placeholder="Full name" />
                  <input value={setupEmail} onChange={(event) => setSetupEmail(event.target.value)} placeholder="Email address" />
                  <input value={setupPhone} onChange={(event) => setSetupPhone(event.target.value)} placeholder="Phone number" />
                  <div className="admin-password-control">
                    <input
                      type={showSetupPassword ? 'text' : 'password'}
                      value={setupPassword}
                      onChange={(event) => setSetupPassword(event.target.value)}
                      placeholder="Password"
                      aria-label="First staff password"
                    />
                    <button
                      className="admin-password-eye"
                      type="button"
                      onClick={() => setShowSetupPassword((visible) => !visible)}
                      aria-label={showSetupPassword ? 'Hide first staff password' : 'Show first staff password'}
                    >
                      <AdminPasswordEyeIcon hidden={!showSetupPassword} />
                    </button>
                  </div>
                </div>
                <div className="admin-login-submit-row">
                  <button className="button primary" type="submit" disabled={loading || !masterKey.trim()}>Create first staff login</button>
                </div>
              </form>
            </div>
          )}

          {staffLoginScreen && (
            <div className="admin-login-screen admin-staff-login-screen">
              <div className="admin-login-screen-head">
                <div>
                  <h1 className="hero-title clean-title admin-staff-login-title">Staff login.</h1>
                  <p className="hero-copy tight-copy">{business.legacy ? "Master key accepted. Sign in with your staff email and password." : `Sign in to ${business.name} with your staff email and password.`}</p>
                </div>
                {business.legacy && <button className="button ghost admin-master-back" type="button" onClick={returnToMasterKey}>Change master key</button>}
              </div>

              {error && <div className="notice warning" role="alert">{error}</div>}
              {!error && message && <div className="notice soft" role="status">{message}</div>}

              <form className="admin-login-card admin-staff-login-card" onSubmit={handleStaffLogin}>
                <h2>{business.legacy ? "2. Staff login" : "Staff login"}</h2>
                <div className="grid two controls-grid admin-staff-fields-row">
                  <input value={staffEmail} onChange={(event) => setStaffEmail(event.target.value)} placeholder="Staff email" />
                  <div className="admin-password-control">
                    <input
                      type={showStaffPassword ? 'text' : 'password'}
                      value={staffPassword}
                      onChange={(event) => setStaffPassword(event.target.value)}
                      placeholder="Staff password"
                      aria-label="Staff password"
                    />
                    <button
                      className="admin-password-eye"
                      type="button"
                      onClick={() => setShowStaffPassword((visible) => !visible)}
                      aria-label={showStaffPassword ? 'Hide staff password' : 'Show staff password'}
                    >
                      <AdminPasswordEyeIcon hidden={!showStaffPassword} />
                    </button>
                  </div>
                </div>
                <div className="admin-login-submit-row admin-staff-submit-row">
                  <button className="button primary" type="submit" disabled={loading || (business.legacy && !masterKey.trim())}>Sign in to admin</button>
                </div>
              </form>
            </div>
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
          <span>{staff.role==='Demo / Reception' ? 'Temporary public demo' : 'Signed in'}</span>
          <strong>{staff.fullName}</strong>
          <small>{business.legacy ? staff.role : `${business.name} · ${staff.role}`}</small>
        </div>
        <a href="/admin" className="admin-staff-center-brand" aria-label="ZipBook admin diary">
          <img className="admin-staff-brand-icon" src="/icons/icon-72.png" alt="" width="44" height="44" />
          <span>
            <strong>ZipBook</strong>
            <small>Appointments {APP_VERSION}</small>
          </span>
        </a>
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
                <span>{staff.role==='Demo / Reception' ? 'Explore the actual Practice Diary with test data. Settings remain private.' : 'One clean menu for diary, reception, clients and practice tools.'}</span>
              </div>
              <div className="admin-mega-menu-grid">
                {adminMenuItems.filter(item => staff.role==='Demo / Reception' ? ['/admin','/admin/reception','/admin/data'].includes(item.href) : (item.href !== '/admin/integrations' || !business.legacy) && (business.legacy || staff.role === "Owner" || !["/admin/staff", "/admin/settings", "/admin/integrations"].includes(item.href))).map((item) => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
                  return (
                    <a key={item.href} href={item.href} className={active ? 'active' : ''} role="menuitem" onClick={() => setMenuOpen(false)}>
                      <strong>{item.label}</strong>
                      <span>{item.helper}</span>
                    </a>
                  );
                })}
              </div>
              <button type="button" className="admin-mega-signout" onClick={() => { setMenuOpen(false); signOut(); }}>{staff.role==='Demo / Reception' ? 'End demo session' : 'Staff sign out'}</button>
            </div>
          )}
        </div>
      </div>
      {staff.role==='Demo / Reception' && <div className="zip-demo-diary-banner" role="status">LIVE ZIPBOOK DEMO · Real connected Practice Diary · Test data only · <a href="https://zipbook.app/demo">Back to demo</a></div>}
      {isAdminUtility ? children : children}
    </>
  );
}
