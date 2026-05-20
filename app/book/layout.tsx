import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Book Appointment',
  description: 'Choose a treatment, select an available time, and confirm your appointment.',
  manifest: '/manifest-client.json',
  alternates: { canonical: '/book' }
};

export const viewport: Viewport = { themeColor: '#2563eb' };

export default function BookLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
