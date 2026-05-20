import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';
import { ZIPBOOK_DOMAINS } from '@/lib/domains';

export default function HomePage() {
  return (
    <main className="shell fresh-shell">
      <Header area="landing" />
      <section className="focus-hero">
        <div>
          <p className="badge blue-badge">{APP_VERSION} · Appointment booking</p>
          <h1 className="hero-title clean-title">ZipBook keeps client bookings and practice diaries in sync.</h1>
          <p className="hero-copy tight-copy">
            Clients can choose a treatment, browse real availability and confirm a live appointment, while reception teams manage the same diary from the admin app.
          </p>
          <div className="nav-pills">
            <Link className="button primary" href="/book">Open Client App</Link>
            <Link className="button orange" href="/admin">Open Admin App</Link>
          </div>
        </div>
        <div className="visual-card grid">
          <div className="mini-card"><strong>Client domain</strong><span>{ZIPBOOK_DOMAINS.client.replace('https://', '')}</span></div>
          <div className="mini-card"><strong>Admin domain</strong><span>{ZIPBOOK_DOMAINS.admin.replace('https://', '')}</span></div>
          <div className="mini-card"><strong>Shared diary</strong><span>One booking source for both apps.</span></div>
        </div>
      </section>
      <p className="footer-note">Built by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
