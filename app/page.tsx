import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/domains';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: { absolute: 'ZipBook — Online appointment booking for your business' },
  description: 'Connect online appointment bookings, your team and your Practice Diary. Explore ZipBook and try the interactive demo.',
};

const features = [
  { icon: 'calendar', title: 'Bookings, made simple', description: 'Let clients choose a service, practitioner and available appointment time from their phone or computer.' },
  { icon: 'diary', title: 'One shared Practice Diary', description: 'Keep appointments, working hours, breaks and practitioner leave together in one organised workspace.' },
  { icon: 'people', title: 'Your team, connected', description: 'Give your team their own staff logins and manage the services each practitioner provides.' },
  { icon: 'globe', title: 'Keep your existing website', description: 'Add a direct booking link or use the supported website integration options. No new website needed.' },
  { icon: 'palette', title: 'Make it yours', description: 'Personalise the Customer Booking App with your business logo, brand colours and chosen font.' },
  { icon: 'phone', title: 'Designed for everyday use', description: 'Access bookings and your diary on a computer, tablet or phone. Install the app on supported devices.' },
] as const;

type IconName = typeof features[number]['icon'];
function FeatureIcon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5 3 3 5-5"/></>}
    {name === 'diary' && <><rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18M3 7h4M3 12h4M3 17h4m6-10h4m-4 5h4m-4 5h4"/></>}
    {name === 'people' && <><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/></>}
    {name === 'globe' && <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>}
    {name === 'palette' && <><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4 2 2 0 0 1 0-4H17a4 4 0 0 0 4-4c0-3.3-4-6-9-6Z"/><circle cx="7.5" cy="11" r=".7"/><circle cx="10" cy="6.8" r=".7"/><circle cx="15" cy="7.2" r=".7"/></>}
    {name === 'phone' && <><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4m-4-9 2 2 3-3"/></>}
  </svg>;
}

function DiaryPreview() {
  return <figure className={styles.preview} aria-label="Illustrative Practice Diary with sample appointments, not live data">
    <div className={styles.previewTop}><div className={styles.previewIdentity}><img src="/icons/icon-72.png" alt="" width="34" height="34"/><div><strong>Practice Diary</strong><span>Example workspace</span></div></div><span className={styles.previewTag}>Sample view</span></div>
    <div className={styles.previewBody}>
      <div className={styles.previewDate}><div><span>Daily overview</span><strong>Wednesday</strong></div><span className={styles.previewDay}>Day view</span></div>
      <div className={styles.metrics}><div><span>Practitioners</span><strong>2</strong></div><div><span>Appointments</span><strong>3</strong></div><div><span>Open slots</span><strong>2</strong></div></div>
      <div className={styles.schedule}>
        <div className={styles.scheduleHead}><span>Time</span><strong>Practitioner 1</strong><strong>Practitioner 2</strong></div>
        <div className={styles.scheduleRow}><span>09:00</span><div className={styles.appointment}><strong>Consultation</strong><small>09:00 – 09:30</small></div><div className={styles.available}>Available</div></div>
        <div className={styles.scheduleRow}><span>09:30</span><div className={styles.available}>Available</div><div className={`${styles.appointment} ${styles.altAppointment}`}><strong>Assessment</strong><small>09:30 – 10:00</small></div></div>
        <div className={styles.scheduleRow}><span>10:00</span><div className={styles.appointment}><strong>Follow-up</strong><small>10:00 – 10:30</small></div><div className={styles.breakSlot}>Break</div></div>
      </div>
      <div className={styles.previewFoot}><span className={styles.dot}/><span>Online bookings and staff appointments in one diary.</span></div>
    </div>
    <figcaption>Illustrative diary preview · fictional appointments</figcaption>
  </figure>;
}

export default function HomePage() {
  return (
    <div className={styles.landing} id="top">
      <a className={styles.skip} href="#main-content">Skip to content</a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.brand} aria-label="ZipBook home"><img src="/icons/icon-72.png" alt="" width="44" height="44"/><span>ZipBook<span className={styles.brandSub}>Appointment management</span></span></Link>
          <nav className={styles.nav} aria-label="Main navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link href="/widget">Website integration</Link></nav>
          <div className={styles.headerActions}><Link href="/admin" className={styles.signIn}>Staff sign in</Link><Link href="/demo" className={`${styles.btn} ${styles.primary} ${styles.navButton}`}>Try the demo</Link></div>
        </div>
      </header>
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span/> Online booking &amp; practice management</p>
              <h1 id="hero-title">Your appointments.<br/>Your business.<br/><em>One shared diary.</em></h1>
              <p className={styles.lead}>Give your clients an easier way to book, and give your team one place to manage appointments, availability and everyday practice operations.</p>
              <div className={styles.actions}><Link href="/demo" className={`${styles.btn} ${styles.primary}`}>Explore the live demo <span aria-hidden="true">→</span></Link><Link href="/widget" className={`${styles.btn} ${styles.secondary}`}>Website integration</Link></div>
              <p className={styles.heroNote}>Explore the customer booking experience and the Practice Diary.</p>
            </div>
            <DiaryPreview />
          </div>
        </section>
        <div className={styles.strip}><div className={`${styles.container} ${styles.stripInner}`}><span><FeatureIcon name="calendar"/> Online appointments</span><span><FeatureIcon name="diary"/> Shared staff diary</span><span><FeatureIcon name="palette"/> Your business branding</span><span><FeatureIcon name="globe"/> Website integration</span></div></div>
        <section className={`${styles.container} ${styles.section}`} id="features" aria-labelledby="features-title">
          <div className={styles.sectionIntro}><p className={styles.kicker}>Built around your business</p><h2 id="features-title">Everything you need to stay organised.</h2><p>From the first appointment request to the working day ahead, ZipBook brings the essential tools together.</p></div>
          <div className={styles.featureGrid}>{features.map(feature => <article className={styles.feature} key={feature.title}><div className={styles.icon}><FeatureIcon name={feature.icon}/></div><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div>
        </section>
        <section className={styles.workflow} id="how-it-works" aria-labelledby="workflow-title"><div className={`${styles.container} ${styles.section}`}><div className={styles.sectionIntro}><p className={styles.kicker}>Getting started</p><h2 id="workflow-title">From setup to your first booking.</h2><p>Business accounts are currently created by invitation. We'll guide you through getting your practice ready.</p></div><ol className={styles.steps}><li><span>01</span><h3>Set up your business</h3><p>Accept your invitation, create your owner password and configure your team, services and availability.</p></li><li><span>02</span><h3>Connect your booking page</h3><p>Choose your business branding, then share your booking link or add it to your existing website.</p></li><li><span>03</span><h3>Start accepting appointments</h3><p>Once public bookings are approved, clients can book and your team can manage appointments in the diary.</p></li></ol></div></section>
        <section className={`${styles.container} ${styles.section} ${styles.integration}`} aria-labelledby="integration-title"><div className={styles.integrationGraphic} aria-hidden="true"><div className={styles.siteMock}><div className={styles.siteBar}><i/><i/><i/><span>your website</span></div><div className={styles.siteContent}><FeatureIcon name="globe"/><strong>Your business website</strong><div className={styles.mockLine}/><div className={styles.mockButton}>Book an appointment →</div></div></div><div className={styles.connection}>↓</div><div className={styles.connected}><img src="/icons/icon-72.png" alt="" width="40" height="40"/><div><strong>ZipBook</strong><span>Your own booking page</span></div></div></div><div><p className={styles.kicker}>Website integration</p><h2 id="integration-title">Your website stays yours.</h2><p className={styles.integrationCopy}>Connect ZipBook to the website you already have. Use a booking button or supported embed options, with your business branding carried through to the customer booking experience.</p><Link className={styles.textLink} href="/widget">Discover integration options <span aria-hidden="true">→</span></Link></div></section>
        <section className={styles.cta} aria-labelledby="cta-title"><div className={`${styles.container} ${styles.ctaInner}`}><div><p className={styles.kicker}>See ZipBook in action</p><h2 id="cta-title">A better way to manage your working day.</h2><p>Try the booking journey and explore the Practice Diary before setting up your own business.</p></div><div className={styles.ctaActions}><Link className={`${styles.btn} ${styles.lightButton}`} href="/demo">Try the demo <span aria-hidden="true">→</span></Link><a className={styles.ctaLink} href="https://zippyweb.uk/">Enquire via ZippyWeb <span aria-hidden="true">↗</span></a></div></div></section>
      </main>
      <footer className={styles.footer}><div className={`${styles.container} ${styles.footerGrid}`}><div><Link href="/" className={styles.brand}><img src="/icons/icon-72.png" alt="" width="40" height="40"/><span>ZipBook</span></Link><p>Online appointments and practice management.</p></div><div><h2>Explore</h2><Link href="/demo">Live demo</Link><Link href="/widget">Website integration</Link></div><div><h2>Already using ZipBook?</h2><Link href="/book">Open customer app</Link><Link href="/admin">Staff sign in</Link><p>Use your business-specific link if you have one.</p></div></div><div className={`${styles.container} ${styles.footerBottom}`}><span>Built by <a href="https://zippyweb.uk/">ZippyWeb</a>.</span><span>{APP_VERSION}</span></div></footer>
    </div>
  );
}
