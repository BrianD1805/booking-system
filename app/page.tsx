import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';

export default function HomePage() {
  return (
    <main className="shell fresh-shell">
      <Header area="landing" />
      <section className="focus-hero">
        <div>
          <p className="badge blue-badge">{APP_VERSION} · Dental appointment booking</p>
          <h1 className="hero-title clean-title">A calm way to book dental appointments.</h1>
          <p className="hero-copy tight-copy">
            Clients can choose a treatment, browse real availability and confirm a live appointment, while reception teams manage the same diary from the admin app.
          </p>
          <div className="nav-pills">
            <Link className="button primary" href="/book">Open Client App</Link>
            <Link className="button orange" href="/admin">Open Admin App</Link>
          </div>
        </div>
        <div className="visual-card grid">
          <div className="mini-card"><strong>Popup flow</strong><span>Less clutter on mobile screens.</span></div>
          <div className="mini-card"><strong>Installable app</strong><span>Client and admin PWAs from one domain.</span></div>
          <div className="mini-card"><strong>Live diary</strong><span>Same Netlify Database source.</span></div>
        </div>
      </section>
      <p className="footer-note">Built by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
