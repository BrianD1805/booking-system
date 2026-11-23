import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_HOSTS, CLIENT_HOSTS, ZIPBOOK_DOMAINS, isLocalHost, normaliseHost } from './lib/domains';
import { classifyTenantHost } from './lib/tenantHost.mjs';
import { safeRemoteFramePolicy } from './lib/embedPolicy.mjs';

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


// The original /admin and /book routes remain unframeable unless the
// business owner approves exact HTTPS origins. CSP is set on the actual app
// document (not a cosmetic wrapper) so browser frame-ancestor checks apply.
async function websiteFramePolicy(host:string, pathname:string, request:NextRequest) {
  const blocked = "frame-ancestors 'none'";
  if (process.env.ZIPBOOK_ENABLE_BUSINESS_ACCOUNTS !== '1') return blocked;
  const tenant = classifyTenantHost(host, {enabled:true,local:process.env.NODE_ENV!=='production'});
  if (tenant.kind !== 'business') return blocked;
  const kind = pathname === '/admin' || pathname.startsWith('/admin/') ? 'admin' : 'public';
  try {
    // Netlify's Next.js Proxy is packaged as middleware. Never import the
    // PostgreSQL driver into this entry point: it can fail to load on Netlify.
    // The API route runs with normal server dependencies and tenant-scoped RLS.
    const policyUrl = new URL('/api/embed-frame-policy', request.url);
    policyUrl.searchParams.set('kind', kind);
    const response = await fetch(policyUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return blocked;
    const policy = await response.json();
    return safeRemoteFramePolicy(policy);
  } catch {
    // A lookup failure must never enable an unauthorised website to frame ZipBook.
    console.error('ZipBook embed frame policy unavailable; framing blocked.');
    return blocked;
  }
}

export async function proxy(request: NextRequest) {
  const host = normaliseHost(request.headers.get('host'));
  const { pathname } = request.nextUrl;

  if (pathname === '/platform' || pathname.startsWith('/platform/') || pathname === '/join' || pathname.startsWith('/join/')) {
    if (!(['zipbook.app','www.zipbook.app'].includes(host) || (process.env.NODE_ENV !== 'production' && ['localhost','127.0.0.1'].includes(host)))) return new NextResponse('Not found.', {status:404});
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  // Temporary public demo is isolated to the canonical ZipBook public host.
  // Never frame or cache it, and never route it through business/Admin hosts.
  if (pathname === '/demo' || pathname.startsWith('/demo/')) {
    if (!CLIENT_HOSTS.has(host) && !(process.env.NODE_ENV !== 'production' && isLocalHost(host))) {
      return new NextResponse('Not found.', {status:404});
    }
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  }

  if (pathname.startsWith('/api')) {
    logApiRequest(pathname);
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  }

  const isBusinessHost = /^[a-z0-9-]+\.(zipbook\.app|localhost)$/.test(host) && !ADMIN_HOSTS.has(host) && !CLIENT_HOSTS.has(host);
  if (isBusinessHost && (pathname === '/manifest-admin.json' || pathname === '/manifest-client.json')) {
    const admin = pathname.includes('admin');
    return NextResponse.json({id:admin?'/admin':'/book',name:admin?'ZipBook Admin':'ZipBook',short_name:admin?'ZipBook Admin':'ZipBook',start_url:admin?'/admin':'/book',scope:admin?'/admin':'/book',display:'standalone',background_color:'#eff6ff',theme_color:'#336699',icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'}]}, {headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-store'}});
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

  if (isBusinessHost) {
    if (pathname === '/') return NextResponse.redirect(new URL('/book', request.url));
    const response = NextResponse.next();
    const html = (request.headers.get('accept') || '').includes('text/html');
    const websitePage = pathname === '/book' || pathname.startsWith('/book/') || pathname === '/admin' || pathname.startsWith('/admin/');
    const csp = websitePage && html ? await websiteFramePolicy(host,pathname,request) : "frame-ancestors 'none'";
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (websitePage) response.headers.set('Cache-Control','private, no-store, max-age=0');
    return response;
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
