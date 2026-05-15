import Link from 'next/link';
import { Header } from '@/components/Header';

export default function HomePage() {
  return (
    <main className="shell">
      <Header area="landing" />
      <section className="hero">
        <div className="card">
          <p className="badge">Dedicated dentist booking build now, SaaS-ready later</p>
          <h1 className="hero-title">Two installable booking apps from one domain.</h1>
          <p className="hero-copy">
            This Ver-0.001 foundation separates the public client booking journey from the practice owner/admin area,
            while keeping the future SaaS route open for subdomains, custom domains and shared Supabase tenancy.
          </p>
          <div className="nav-pills">
            <Link className="button primary" href="/book">Open Client App</Link>
            <Link className="button orange" href="/admin">Open Admin App</Link>
          </div>
        </div>
        <div className="card grid">
          <div className="stat"><strong>Client PWA</strong><span>Patients request, confirm, reschedule and manage bookings.</span></div>
          <div className="stat"><strong>Admin PWA</strong><span>Dentist/team manage diary, procedures, blocks, reminders and messages.</span></div>
          <div className="stat"><strong>Embed-ready</strong><span>Booking widget can be added to an existing website with simple HTML.</span></div>
          <div className="stat"><strong>SaaS path</strong><span>Tenant subdomains, optional custom domains and Supabase-backed tenancy later.</span></div>
        </div>
      </section>
      <p className="footer-note">Built by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
