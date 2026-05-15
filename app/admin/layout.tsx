import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Admin | ZippyWeb Booking System',
  description: 'Owner admin appointment booking app.',
  manifest: '/manifest-admin.json'
};

export const viewport: Viewport = { themeColor: '#224866' };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
