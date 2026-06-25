import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_HOSTS, CLIENT_HOSTS, ZIPBOOK_DOMAINS, isLocalHost, normaliseHost } from './lib/domains';

const PUBLIC_FILE = /\.(.*)$/;

type ApiLogState = { total: number; routes: Record<string, number>; startedAt: number };

function shouldLogApiRequests() {
  try {
    return process.env.ZIPBOOK_API_ROUTE_LOGGING !== '0';
  } catch {
    return true;
  }
}

function logApiRequest(pathname: string) {
  if (!shouldLogApiRequests()) return;
  const key = pathname.replace(/\/[^/]+(?=\/|$)/g, (part) => (/^\/[a-z0-9-]{10,}$/i.test(part) ? '/:id' : part));
  const globalStore = globalThis as typeof globalThis & { __zipbookApiLogState?: ApiLogState };
  const state = globalStore.__zipbookApiLogState ?? { total: 0, routes: {}, startedAt: Date.now() };
  state.total += 1;
  state.routes[key] = (state.routes[key] ?? 0) + 1;
  globalStore.__zipbookApiLogState = state;

  if (state.total === 1 || state.total % 25 === 0) {
    const topRoutes = Object.entries(state.routes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([route, count]) => `${route}=${count}`)
      .join(', ');
    console.info(`[ZipBook API route counts] total=${state.total}; top=${topRoutes}`);
  }
}


export function proxy(request: NextRequest) {
  const host = normaliseHost(request.headers.get('host'));
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    logApiRequest(pathname);
    return NextResponse.next();
  }

  if (
    
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
    // Public ZipBook domain root must stay as the marketing landing page.
    // The client booking PWA lives deliberately at /book.
    if (pathname === '/' || pathname === '') {
      return NextResponse.next();
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
