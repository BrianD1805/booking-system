import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_HOSTS, CLIENT_HOSTS, ZIPBOOK_DOMAINS, isLocalHost, normaliseHost } from './lib/domains';

const PUBLIC_FILE = /\.(.*)$/;

export function proxy(request: NextRequest) {
  const host = normaliseHost(request.headers.get('host'));
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/og-image.png' ||
    pathname === '/offline.html' ||
    pathname === '/sw.js' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (isLocalHost(host) || host.endsWith('netlify.app')) {
    return NextResponse.next();
  }

  if (ADMIN_HOSTS.has(host)) {
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/admin', request.url));
    }

    if (pathname === '/book' || pathname.startsWith('/book/')) {
      const target = new URL(pathname, ZIPBOOK_DOMAINS.client);
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target);
    }

    return NextResponse.next();
  }

  if (CLIENT_HOSTS.has(host)) {
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/book', request.url));
    }

    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const adminPath = pathname.replace(/^\/admin/, '') || '/';
      const target = new URL(adminPath, ZIPBOOK_DOMAINS.admin);
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
