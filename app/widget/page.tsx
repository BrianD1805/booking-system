import Link from 'next/link';
import { Header } from '@/components/Header';

export default function WidgetPage() {
  return (
    <main className="shell fresh-shell">
      <Header area="landing" />
      <section className="focus-hero">
        <div>
          <p className="badge blue-badge">Website integration</p>
          <h1 className="hero-title clean-title">Your website. Your bookings.</h1>
          <p className="hero-copy tight-copy">Add ZipBook to the site you already have. Choose a booking button, embed the appointment page or give your staff secure access to their Practice Diary without building a new website.</p>
          <div className="nav-pills"><Link className="button primary" href="/">Back to ZipBook</Link><Link className="button" href="/admin">Business staff sign-in</Link></div>
        </div>
        <div className="visual-card grid">
          <div className="mini-card"><strong>Any website</strong><span>Copy a booking link into a button, menu or social profile.</span></div>
          <div className="mini-card"><strong>Website builders</strong><span>Paste the HTML iframe snippet into a supported custom-code block.</span></div>
          <div className="mini-card"><strong>Code-built websites</strong><span>Use ready-made HTML or React / Next.js iframe code.</span></div>
          <div className="mini-card"><strong>Private staff diary</strong><span>Authorise websites separately; staff still sign in securely.</span></div>
        </div>
      </section>
      <section className="card clean-panel" style={{marginTop:24}}>
        <h2>How installation works</h2>
        <div className="grid three">
          <div><h3>1. Sign in</h3><p>Your business owner opens <strong>Admin → Website integration</strong> to generate codes for their own practice.</p></div>
          <div><h3>2. Approve your website</h3><p>Register its exact HTTPS address and choose whether to allow public bookings, staff diary access or both.</p></div>
          <div><h3>3. Copy and paste</h3><p>Choose the booking button, HTML block or React component and add it to your website.</p></div>
        </div>
      </section>
      <section className="card clean-panel" style={{marginTop:24}}>
        <h2>Different websites, different options</h2>
        <p><strong>WordPress and other website builders:</strong> use an HTML/custom-code block if your builder permits iframes. Some builders or plans block embeds; a direct booking link will still work.</p>
        <p><strong>HTML, JavaScript, React and Next.js:</strong> paste the generated code into your site's page or component. Each business gets a unique booking address.</p>
        <p><strong>Staff diary:</strong> embed only on trusted, authorised sites. Staff sign-in is always required. Because some browsers block sign-in storage inside third-party frames, every staff snippet includes a full-page diary link as a fallback.</p>
      </section>
      <p className="footer-note">No master password or private data is included in any embed code.</p>
    </main>
  );
}
