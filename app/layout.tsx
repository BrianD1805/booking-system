import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegisterServiceWorker } from './register-sw';

const siteUrl = 'https://bookings-system.netlify.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'ZippyWeb Dental Booking',
  title: {
    default: 'ZippyWeb Dental Booking',
    template: '%s | ZippyWeb Dental Booking'
  },
  description: 'Book and manage dental appointments with live diary availability.',
  keywords: ['dental booking', 'appointment booking', 'practice diary', 'PWA booking app'],
  authors: [{ name: 'Brian Hallam at ZippyWeb' }],
  creator: 'Brian Hallam at ZippyWeb',
  publisher: 'ZippyWeb',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico']
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'ZippyWeb Dental Booking',
    description: 'Book and manage dental appointments with live diary availability.',
    siteName: 'ZippyWeb Dental Booking',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ZippyWeb Dental Booking app icon and booking prompt'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZippyWeb Dental Booking',
    description: 'Book and manage dental appointments with live diary availability.',
    images: ['/og-image.png']
  },
  appleWebApp: {
    capable: true,
    title: 'Dental Booking',
    statusBarStyle: 'default'
  }
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><RegisterServiceWorker />{children}</body>
    </html>
  );
}
