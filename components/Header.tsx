import Link from 'next/link';
import { APP_VERSION } from '@/lib/mockData';

export function Header({ area }: { area: 'client' | 'admin' | 'landing' }) {
  const contextLabel = area === 'client' ? 'Book appointment' : area === 'admin' ? 'Practice diary' : 'Live booking system';

  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="ZippyWeb Dental Booking home">
        <img className="brand-icon" src="/icons/icon-72.png" alt="" width="44" height="44" />
        <span>
          ZippyWeb<br />
          <small style={{ color: 'var(--muted)', fontWeight: 700 }}>Dental Booking {APP_VERSION}</small>
        </span>
      </Link>
      <nav className="nav-pills" aria-label="Main navigation">
        <Link className="pill" href="/book">Book Appointment</Link>
        <Link className="pill" href="/admin">Practice Diary</Link>
        <Link className="pill" href="/widget">Website Embed</Link>
        <span className="pill">{contextLabel}</span>
      </nav>
    </header>
  );
}
