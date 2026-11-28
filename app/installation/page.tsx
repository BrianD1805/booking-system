import type {Metadata} from 'next';
import Link from 'next/link';
import {APP_VERSION,ZIPBOOK_DOMAINS} from '@/lib/domains';
import {bookingHtmlSnippet,reactEmbedSnippet,businessEmbedUrls} from '@/lib/embedPolicy.mjs';
import {InstallationCode} from './InstallationCode';
import styles from '../landing.module.css';

export const metadata:Metadata={
  title:'Website installation and FAQs',
  description:'Step-by-step instructions for adding ZipBook to your website, including booking links, HTML widgets, React and Next.js integration and frequently asked questions.',
  alternates:{canonical:`${ZIPBOOK_DOMAINS.client}/installation`},
};

const exampleSlug='your-business';
const exampleUrl=businessEmbedUrls(exampleSlug).booking;
const faq=[
  ['Do I need a new website?','No. Add a booking button or embed the Customer Booking App on your existing website. Your business must have its own active ZipBook account and public bookings enabled.'],
  ['Which installation method should I use?','A direct booking link is the simplest and most reliable option. Choose an embedded widget if you want customers to remain on your website and your website supports custom HTML and JavaScript.'],
  ['Where do I get my own installation code?','Open your existing business-specific Practice Diary using the URL provided in your welcome email. In Website integration, copy the direct booking URL, HTML booking button, HTML booking iframe or React / Next.js component. The examples on this page are not your own live code.'],
  ['Do I need to authorise my website?','Only for embedding. Add the exact HTTPS origin in Website integration and enable public booking iframe permission. Authorise www and non-www addresses separately if both are used, and any staging domain you control. Direct booking links do not need iframe permission.'],
  ['Can I use WordPress, Wix or another website builder?','A direct booking link works wherever the builder supports links. Embedded installation requires a custom HTML block that permits both iframes and JavaScript. Some builders or plans restrict scripts or add an extra sandbox; if the embed cannot establish its connection, use the direct link instead.'],
  ['Will the widget match my website?','Your business owner can set the logo, permitted colours and font in Customer App Branding. The embedded mode uses a transparent surrounding background and a compact entry screen. Protected booking controls, including the calendar and time selector, retain standard ZipBook styling.'],
  ['Why does the widget show a blank area or refuse to connect?','Check that public bookings are open, the exact host origin is authorised, the full current snippet including its script has been installed, and the host permits cross-origin iframes and scripts. Check the browser console for blocked frame or script messages. Use the direct link if restrictions cannot be resolved.'],
  ['Why does the widget scroll differently from my website?','The full current snippet includes automatic height adjustment and host-page scrolling communication. Do not replace it with a fixed-height iframe or hide overflow. Test your own website on desktop and mobile; some host layouts and browsers may still behave differently.'],
  ['Can customers sign in inside the widget?','The Customer App supports guest bookings and customer accounts. Some browsers restrict third-party storage or cookies, so embedded sign-in may not work in every browser. The supplied code includes a full-page booking link as a fallback.'],
  ['Where do appointments appear?','Appointments made using your business-specific booking link or widget appear in that business’s Practice Diary, subject to its current availability and booking rules.'],
  ['Can I embed the staff diary on my website?','There is a separate secure staff diary integration in Website integration. Only enable it for trusted websites you control. Staff authentication is still required. Do not use staff diary code for your public customer booking page.'],
  ['Do I need to update my website when ZipBook changes?','Most booking features update within ZipBook itself. If the host-side integration code changes, copy the latest complete snippet from Website integration and replace the previous component or HTML block. Test the integration after publishing.'],
  ['Can I move from a test website to my live domain?','Yes. Authorise the final HTTPS website origin before publishing there. Your business-specific booking URL stays the same. Remove old staging origins when you no longer need them.'],
] as const;

export default function InstallationPage(){
  return <div className={styles.landing}>
    <a className={styles.skip} href="#main-content">Skip to content</a>
    <header className={styles.header}><div className={`${styles.container} ${styles.headerInner}`}>
      <Link href="/" className={styles.brand} aria-label="ZipBook home"><img src="/icons/icon-72.png" alt="" width="44" height="44"/><span>ZipBook<span className={styles.brandSub}>Appointment management</span></span></Link>
      <nav className={styles.nav} aria-label="Main navigation"><Link href="/">Home</Link><Link href="/#features">Features</Link><Link href="/installation" aria-current="page">Website installation</Link><a href="#faqs">FAQs</a></nav>
      <div className={styles.headerActions}><Link href="/demo" className={`${styles.btn} ${styles.primary} ${styles.navButton}`}>Try the demo</Link></div>
    </div></header>
    <main id="main-content">
      <section className={`${styles.hero} ${styles.installHero}`}><div className={styles.container}>
        <p className={styles.eyebrow}><span/> Website installation guide</p>
        <h1>Connect your website.<br/><em>Start taking bookings.</em></h1>
        <p className={styles.lead}>Add your business’s ZipBook booking link or install a responsive booking widget. Follow the instructions for your website below.</p>
        <div className={styles.actions}><a className={`${styles.btn} ${styles.primary}`} href="#get-code">Get installation code ↓</a><a className={`${styles.btn} ${styles.secondary}`} href="#faqs">Frequently asked questions</a></div>
      </div></section>
      <div className={`${styles.container} ${styles.installContent}`}>
        <section className={styles.installSection} aria-labelledby="get-code"><p className={styles.kicker}>01 · Preparation</p><h2 id="get-code">Get your business’s installation code</h2>
          <ol className={styles.installSteps}>
            <li><strong>Open your own Practice Diary.</strong> Use the business-specific diary URL in your welcome email, your registered email address and the password you created. Open Website integration in the diary menu.</li>
            <li><strong>Check that online bookings are open.</strong> Set up practitioners, services and working hours and ensure your business has been approved for public bookings.</li>
            <li><strong>For an embedded widget, authorise your website.</strong> Under Step 1 — Authorised websites, choose Add website. Enter the exact HTTPS origin, such as <code>https://www.example.com</code>, without a page path. Enable public booking iframe permission and save. Leave secure staff diary iframe permission off for a public booking page.</li>
            <li><strong>Copy your code.</strong> In Step 2, copy the Direct booking URL or HTML booking button. In Step 3, copy the HTML booking iframe or React / Next.js booking component. Use the complete current code, not just the iframe tag.</li>
          </ol><p className={styles.installNotice}>The examples below use <code>your-business.zipbook.app</code> as a placeholder. Replace it with your actual business subdomain or, preferably, copy your personalised code directly from Website integration. No passwords or API keys are required in the public code.</p>
        </section>
        <section className={styles.installSection} aria-labelledby="direct-link"><p className={styles.kicker}>02 · Simple installation</p><h2 id="direct-link">Booking link or button</h2><p>Recommended for the quickest setup, or when your website builder restricts embedded apps. Customers open your full booking page.</p>
          <ol className={styles.installSteps}><li>Open the page or navigation item in your website editor.</li><li>Add or edit a Book an appointment button and paste your direct booking URL as its destination.</li><li>Choose to open the link in a new tab if you want to keep your website open. Save and publish.</li><li>Click the button from your published website and confirm that the correct business booking page opens.</li></ol>
          <InstallationCode title="Example direct booking URL" code={exampleUrl}/><InstallationCode title="Example HTML booking button" code={`<a href="${exampleUrl}" target="_blank" rel="noopener noreferrer">Book an appointment</a>`}/>
        </section>
        <section className={styles.installSection} aria-labelledby="html-widget"><p className={styles.kicker}>03 · Embedded installation</p><h2 id="html-widget">HTML widget and website builders</h2><p>For an HTML website, WordPress or another website builder with a custom HTML / code block that permits JavaScript and iframes.</p>
          <ol className={styles.installSteps}><li>Create or open the page where your booking app should appear, for example a Book an appointment page.</li><li>In Website integration, copy the complete HTML booking iframe snippet after authorising your website.</li><li>Paste it into a custom HTML block or directly into the HTML body of your page, where the widget should appear. Do not paste it into a rich-text editor or the site-wide header.</li><li>Keep the included style, iframe, fallback link and script together. The script manages automatic height adjustment, loading feedback and host scrolling.</li><li>Publish and test the booking journey on a desktop and phone. If your website builder strips scripts or blocks framing, use the direct booking link instead.</li></ol>
          <InstallationCode title="Example complete HTML widget code" code={bookingHtmlSnippet(exampleSlug)}/>
        </section>
        <section className={styles.installSection} aria-labelledby="react-widget"><p className={styles.kicker}>04 · Developer installation</p><h2 id="react-widget">React / Next.js component</h2><p>Use the generated component for a React or Next.js website. It is a client component and does not require a separate package or access to the ZipBook database.</p>
          <ol className={styles.installSteps}><li>Authorise the published website’s HTTPS origin in Website integration.</li><li>Copy the React / Next.js booking component and save the full code in <code>components/ZipBookBooking.jsx</code>.</li><li>Import it into your booking page, adjusting the import path to match your project. In the example below, the page is <code>app/bookings/page.jsx</code> and the components directory is at the project root.</li><li>Render <code>&lt;ZipBookBooking /&gt;</code> inside your existing page layout. Do not wrap it in a fixed-height scrolling container.</li><li>Build and publish your website, then test the embedded application and its direct-link fallback.</li></ol>
          <InstallationCode title="Example complete React / Next.js widget component" code={reactEmbedSnippet(exampleSlug,'public')}/>
          <InstallationCode title="Example Next.js booking page (app/bookings/page.jsx)" code={`import ZipBookBooking from '../../components/ZipBookBooking';\n\nexport default function BookingsPage() {\n  return <main>\n    <h1>Book an appointment</h1>\n    <ZipBookBooking />\n  </main>;\n}`}/>
        </section>
        <section className={styles.installSection} aria-labelledby="check-install"><p className={styles.kicker}>05 · Before going live</p><h2 id="check-install">Check your installation</h2><ul className={styles.installSteps}><li>Check that all existing appointment buttons point to your new booking page or direct URL.</li><li>Confirm the correct business logo, colours and font appear.</li><li>Check that the entire booking flow is reachable on desktop and mobile, including calendar and time selection, and that the host page scrolls properly.</li><li>Complete a test appointment and check it appears in your own Practice Diary. Test customer sign-in if required.</li><li>Check the direct booking fallback. Do not enter real customer details while testing unnecessarily.</li></ul><p className={styles.installNotice}>If embedded behaviour is not satisfactory on your website, use your direct booking URL until the integration can be refined.</p></section>
        <section className={styles.installSection} aria-labelledby="faqs"><p className={styles.kicker}>Help and answers</p><h2 id="faqs">Frequently asked questions</h2><div className={styles.installFaq}>{faq.map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
      </div>
      <section className={styles.cta}><div className={`${styles.container} ${styles.ctaInner}`}><div><p className={styles.kicker}>Explore ZipBook</p><h2>See how booking and the diary work together.</h2><p>Try the connected demonstration or contact ZippyWeb for help with your business installation.</p></div><div className={styles.ctaActions}><Link href="/demo" className={`${styles.btn} ${styles.lightButton}`}>Try the demo</Link><a href="https://zippyweb.uk/" className={styles.ctaLink}>Contact ZippyWeb ↗</a></div></div></section>
    </main>
    <footer className={styles.footer}><div className={`${styles.container} ${styles.footerBottom}`}><span>Built by <a href="https://zippyweb.uk/">ZippyWeb</a>.</span><span>{APP_VERSION}</span></div></footer>
  </div>;
}
