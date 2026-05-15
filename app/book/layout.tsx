import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Book Appointment | ZippyWeb Booking System',
  description: 'Client-facing appointment booking app.',
  manifest: '/manifest-client.json'
};

export const viewport: Viewport = { themeColor: '#336699' };

export default function BookLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
