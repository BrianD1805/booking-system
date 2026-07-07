import type { Metadata, Viewport } from 'next';
import { ZIPBOOK_DOMAINS } from '@/lib/domains';

export const metadata: Metadata = {
  title: 'Book Appointment',
  description: 'Choose a treatment, select an available time, review the appointment summary, and confirm your booking.',
  manifest: '/manifest-client.json',
  alternates: { canonical: ZIPBOOK_DOMAINS.client }
};

export const viewport: Viewport = { themeColor: '#336699' };

export default function BookLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
