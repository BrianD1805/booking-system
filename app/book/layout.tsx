import type { Metadata, Viewport } from 'next';
import { ZIPBOOK_DOMAINS } from '@/lib/domains';

export const metadata: Metadata = {
  title: 'Book Appointment',
  description: 'Choose a treatment, select an available time, review the appointment summary, and confirm your booking.',
  manifest: '/api/branding/manifest',
  icons: {
    icon: [{url:'/api/branding/icon?size=192',sizes:'192x192',type:'image/png'}],
    apple: [{url:'/api/branding/icon?size=180',sizes:'180x180',type:'image/png'}]
  },
  alternates: { canonical: ZIPBOOK_DOMAINS.client }
};

export const viewport: Viewport = { themeColor: '#336699' };

export default function BookLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
