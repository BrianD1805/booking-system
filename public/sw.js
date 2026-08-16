const CACHE_NAME = 'zipbook-v0.049';
const CORE_ASSETS = [
  '/',
  '/book',
  '/admin',
  '/admin/data',
  '/admin/settings',
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
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/') || caches.match('/book') || caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
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
