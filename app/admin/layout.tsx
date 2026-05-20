import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Practice Diary',
  description: 'Manage dental appointments, practitioner diaries, and live bookings.',
  manifest: '/manifest-admin.json',
  alternates: { canonical: '/admin' }
};

export const viewport: Viewport = { themeColor: '#113f8c' };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
