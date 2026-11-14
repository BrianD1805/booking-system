const CACHE_NAME = 'zipbook-v0.055';
const CORE_ASSETS = [
  '/',
  '/book',
  '/widget',
  '/offline.html',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-touch-icon.png',
  '/og-image.png',
  '/manifest-client.json',
  '/manifest-admin.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(self.location.hostname.startsWith('admin.') ? CORE_ASSETS.filter((path) => !['/', '/book', '/widget'].includes(path)) : CORE_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('zipbook-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

// API results and private/admin navigation are never stored in CacheStorage.
// Restrict offline assets to the public shell and explicitly static resources.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  if (isNavigationRequest(event.request)) {
    const publicShell = !url.hostname.startsWith('admin.') && !url.search && ['/', '/book', '/widget', '/offline.html'].includes(url.pathname);
    event.respondWith(fetch(event.request).then((response) => {
      if (publicShell && response.ok && !response.redirected) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
      }
      return response;
    }).catch(async () => (publicShell ? await caches.match(event.request) : undefined) || caches.match('/offline.html')));
    return;
  }

  const staticAsset = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || [
    '/favicon.ico', '/apple-touch-icon.png', '/og-image.png', '/manifest-client.json', '/manifest-admin.json'
  ].includes(url.pathname);
  if (!staticAsset) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && !response.redirected) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
    }
    return response;
  }).catch(() => caches.match(event.request)));
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'ZipBook update',
    body: 'You have a new booking update.',
    url: '/book',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png'
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-72.png',
    tag: payload.tag || 'zipbook-booking-update',
    renotify: true,
    data: {
      url: payload.url || '/book',
      bookingId: payload.bookingId || ''
    }
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'ZipBook update', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/book', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          client.navigate(targetUrl).catch(() => undefined);
          return client.focus();
        }
      }

      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
