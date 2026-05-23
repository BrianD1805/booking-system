import Link from 'next/link';
import { APP_VERSION } from '@/lib/mockData';

export function Header({ area }: { area: 'client' | 'admin' | 'landing' }) {
  const contextLabel = area === 'client' ? 'Book appointment' : area === 'admin' ? 'Practice diary' : 'Booking system';

  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="ZipBook home">
        <img className="brand-icon" src="/icons/icon-72.png" alt="" width="44" height="44" />
        <span>
          ZipBook<br />
          <small style={{ color: 'var(--muted)', fontWeight: 700 }}>Appointments {APP_VERSION}</small>
        </span>
      </Link>
      {area === 'client' ? (
        <nav className="nav-pills" aria-label="Client navigation">
          <span className="pill">{contextLabel}</span>
        </nav>
      ) : (
        <nav className="nav-pills" aria-label="Main navigation">
          <Link className="pill" href="/book">Client app</Link>
          {area !== 'admin' && <Link className="pill" href="/admin">Admin app</Link>}
          <Link className="pill" href="/widget">Website embed</Link>
          {area === 'admin' && <Link className="pill" href="/admin/data">Data tool</Link>}
          <span className="pill">{contextLabel}</span>
        </nav>
      )}
    </header>
  );
}
