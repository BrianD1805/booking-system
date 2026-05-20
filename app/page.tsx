import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';

export default function HomePage() {
  return (
    <main className="shell fresh-shell">
      <Header area="landing" />
      <section className="focus-hero">
        <div>
          <p className="badge blue-badge">{APP_VERSION} · Visual booking flow</p>
          <h1 className="hero-title clean-title">Clean blue and white booking apps.</h1>
          <p className="hero-copy tight-copy">
            A calmer visual foundation for a dentist booking system: client bookings open as a guided flow, receptionist bookings use a step-by-step popup on mobile, and both apps keep the same live conflict-protected diary.
          </p>
          <div className="nav-pills">
            <Link className="button primary" href="/book">Open Client App</Link>
            <Link className="button orange" href="/admin">Open Admin App</Link>
          </div>
        </div>
        <div className="visual-card grid">
          <div className="mini-card"><strong>Popup flow</strong><span>Less clutter on mobile screens.</span></div>
          <div className="mini-card"><strong>Blue / white</strong><span>Fresh clinical colour scheme.</span></div>
          <div className="mini-card"><strong>Live diary</strong><span>Same Netlify Database source.</span></div>
        </div>
      </section>
      <p className="footer-note">Built by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
