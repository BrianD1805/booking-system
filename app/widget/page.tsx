import Link from 'next/link';
import { Header } from '@/components/Header';
import { APP_VERSION } from '@/lib/mockData';

export default function WidgetPage() {
  const embedCode = `<iframe src="https://zipbook.app" style="width:100%;min-height:860px;border:0;border-radius:24px;overflow:hidden;" loading="lazy" title="Book an appointment"></iframe>`;

  return (
    <main className="shell">
      <Header area="landing" />
      <section className="card">
        <p className="badge">Website embed · {APP_VERSION}</p>
        <h1 className="hero-title">Add live booking to an existing website.</h1>
        <p className="hero-copy">
          The booking app can be shown as a dedicated subdomain, a custom domain, or embedded into an existing company website with a simple HTML iframe.
        </p>
        <div className="form-row">
          <label htmlFor="embedCode">Starter HTML embed code</label>
          <textarea id="embedCode" readOnly value={embedCode} />
        </div>
        <Link className="button primary" href="/book">Preview client app</Link>
      </section>
    </main>
  );
}
