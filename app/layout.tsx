import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegisterServiceWorker } from './register-sw';

export const metadata: Metadata = {
  title: 'ZippyWeb Booking System',
  description: 'Booking system foundation by ZippyWeb.',
};

export const viewport: Viewport = {
  themeColor: '#336699',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><RegisterServiceWorker />{children}</body>
    </html>
  );
}
