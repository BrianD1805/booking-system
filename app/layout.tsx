import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegisterServiceWorker } from './register-sw';
import { ZIPBOOK_DOMAINS } from '@/lib/domains';

const siteUrl = ZIPBOOK_DOMAINS.client;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'ZipBook',
  title: {
    default: 'ZipBook',
    template: '%s | ZipBook'
  },
  description: 'Book appointments online and manage live diary availability.',
  keywords: ['appointment booking', 'dental booking', 'practice diary', 'PWA booking app', 'ZipBook'],
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
    title: 'ZipBook',
    description: 'Book appointments online and manage live diary availability.',
    siteName: 'ZipBook',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 1200,
        alt: 'ZipBook calendar booking app icon'
      }
    ]
  },
  twitter: {
    card: 'summary',
    title: 'ZipBook',
    description: 'Book appointments online and manage live diary availability.',
    images: ['/og-image.png']
  },
  appleWebApp: {
    capable: true,
    title: 'ZipBook',
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
