const CACHE_NAME = 'zipbook-v0.007a';
const CORE_ASSETS = ['/', '/book', '/admin', '/widget', '/offline.html', '/favicon.ico', '/icons/icon-192.png', '/icons/icon-512.png', '/apple-touch-icon.png', '/og-image.png', '/manifest-client.json', '/manifest-admin.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))));
});
