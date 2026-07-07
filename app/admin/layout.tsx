import type { Metadata, Viewport } from 'next';
import { ZIPBOOK_DOMAINS } from '@/lib/domains';
import { AdminAuthGate } from '@/components/admin/AdminAuthGate';

export const metadata: Metadata = {
  title: 'Admin Diary',
  description: 'Manage appointments, practitioner diaries, bookings, and practice availability.',
  manifest: '/manifest-admin.json',
  alternates: { canonical: ZIPBOOK_DOMAINS.admin }
};

export const viewport: Viewport = { themeColor: '#336699' };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminAuthGate>{children}</AdminAuthGate>;
}
