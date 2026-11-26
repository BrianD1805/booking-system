import type { Metadata, Viewport } from 'next';
import { customerThemeForPage } from '@/lib/customerThemeRequest';
import { themeVariables,themeFontUrl } from '@/lib/customerTheme.mjs';
import './customer-theme.css';
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

export const dynamic = 'force-dynamic';
export async function generateViewport(): Promise<Viewport> {
  const theme=await customerThemeForPage();
  return {themeColor:theme?.primary ?? '#336699'};
}

export default async function BookLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme=await customerThemeForPage();
  if(!theme)return children;
  // Values are validated hex colours and fixed font stacks, never arbitrary website CSS.
  const variables=Object.entries(themeVariables(theme)).map(([k,v])=>`${k}:${v}`).join(';');
  const fontUrl=themeFontUrl(theme.font);
  return <>{fontUrl&&<link rel="stylesheet" href={fontUrl} referrerPolicy="no-referrer" />}<style>{`body:has(#zb-customer-theme){${variables}}`}</style><div id="zb-customer-theme" hidden aria-hidden="true" />{children}</>;
}
