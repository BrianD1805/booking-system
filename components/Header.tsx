import Link from 'next/link';

export function Header({ area }: { area: 'client' | 'admin' | 'landing' }) {
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="ZippyWeb Booking System home">
        <span className="logo-mark">ZW</span>
        <span>
          ZippyWeb<br />
          <small style={{ color: 'var(--muted)', fontWeight: 700 }}>Booking System Ver-0.001</small>
        </span>
      </Link>
      <nav className="nav-pills" aria-label="Main navigation">
        <Link className="pill" href="/book">Client App</Link>
        <Link className="pill" href="/admin">Admin App</Link>
        <Link className="pill" href="/widget">Website Embed</Link>
        <span className="pill">{area === 'client' ? 'Client-facing PWA' : area === 'admin' ? 'Owner/Admin PWA' : 'Foundation'}</span>
      </nav>
    </header>
  );
}
