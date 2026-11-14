import Link from 'next/link';
import { Header } from '@/components/Header';

export default function WidgetPage() {
  return (
    <main className="shell fresh-shell">
      <Header area="landing" />
      <section className="focus-hero">
        <div>
          <p className="badge blue-badge">Website integration</p>
          <h1 className="hero-title clean-title">Keep your website. Connect your bookings.</h1>
          <p className="hero-copy tight-copy">ZipBook is designed to work with an existing website, whether it is built with a website builder or developed using code.</p>
          <Link className="button primary" href="/">Back to ZipBook</Link>
        </div>
        <div className="visual-card grid">
          <div className="mini-card"><strong>Booking link</strong><span>Use a Book now button that opens a dedicated booking page.</span></div>
          <div className="mini-card"><strong>HTML integration</strong><span>For websites that support custom HTML blocks or direct code editing.</span></div>
          <div className="mini-card"><strong>Staff diary</strong><span>Keep private diary access separate from your public booking page.</span></div>
        </div>
      </section>
      <section className="card" style={{ marginTop: 24 }}>
        <h2>Business-specific installation</h2>
        <p className="hero-copy tight-copy">Business-specific links and embed codes are not yet available for self-service installation. Existing users can continue using the ZipBook client app and staff diary.</p>
        <div className="nav-pills"><Link className="button" href="/book">Client app</Link><Link className="button" href="/admin">Staff sign in</Link></div>
      </section>
    </main>
  );
}
