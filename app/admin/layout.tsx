import type { Metadata, Viewport } from 'next';
import { ZIPBOOK_DOMAINS } from '@/lib/domains';

export const metadata: Metadata = {
  title: 'Admin Diary',
  description: 'Manage appointments, practitioner diaries, bookings, and practice availability.',
  manifest: '/manifest-admin.json',
  alternates: { canonical: ZIPBOOK_DOMAINS.admin }
};

export const viewport: Viewport = { themeColor: '#113f8c' };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
