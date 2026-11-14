import Link from 'next/link';
import { Header } from '@/components/Header';

export default function HomePage() {
  return (
    <main className="shell fresh-shell">
      <Header area="landing" />
      <section className="focus-hero">
        <div>
          <p className="badge blue-badge">Online appointment booking</p>
          <h1 className="hero-title clean-title">Your appointments. Your business. One shared diary.</h1>
          <p className="hero-copy tight-copy">ZipBook brings online bookings, staff diaries and client management together. Manage appointments and working hours in one place, and let your clients book from their phone or computer.</p>
          <div className="nav-pills">
            <Link className="button primary" href="/widget">Website integration</Link>
            <Link className="button green" href="/admin">Staff sign in</Link>
          </div>
        </div>
        <div className="visual-card grid">
          <div className="mini-card"><strong>Online appointments</strong><span>Clients choose a service, practitioner and available time.</span></div>
          <div className="mini-card"><strong>Staff diaries</strong><span>Manage working hours, breaks, leave and appointments.</span></div>
          <div className="mini-card"><strong>Your existing website</strong><span>Keep your business website and connect it with ZipBook.</span></div>
        </div>
      </section>
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Already using ZipBook?</h2>
        <div className="nav-pills"><Link className="button primary" href="/book">Open client app</Link><Link className="button" href="/admin">Open admin diary</Link></div>
      </section>
      <section className="card" style={{ marginTop: 24 }}><h2>Set up your business</h2><p>Business accounts are currently created by invitation. If you have received an invitation, open the link in your email to set up your owner account.</p></section>
      <p className="footer-note">Built by Brian Hallam at ZippyWeb.</p>
    </main>
  );
}
