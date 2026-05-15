import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';

export default function HomePage() {
  return (
    <main className="shell">
      <Header area="landing" />
      <section className="hero">
        <div className="card">
          <p className="badge">{APP_VERSION} · Live diary availability foundation</p>
          <h1 className="hero-title">Two synced booking apps from one domain.</h1>
          <p className="hero-copy">
            The client app lets patients browse diary dates and book available times. The admin app lets dentist staff create, manage, cancel and complete bookings from the same diary source.
          </p>
          <div className="nav-pills">
            <Link className="button primary" href="/book">Open Client App</Link>
            <Link className="button orange" href="/admin">Open Admin App</Link>
          </div>
        </div>
        <div className="card grid">
          <div className="stat"><strong>Client PWA</strong><span>Patients book confirmed appointments from available diary slots.</span></div>
          <div className="stat"><strong>Admin PWA</strong><span>Dentist/team manage the live diary, procedures, blocks, reminders and messages.</span></div>
          <div className="stat"><strong>Embed-ready</strong><span>Booking page can be added to an existing website with simple HTML.</span></div>
          <div className="stat"><strong>SaaS path</strong><span>Dedicated Netlify Database now, later expandable to shared SaaS tenancy.</span></div>
        </div>
      </section>
      <p className="footer-note">Built by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
