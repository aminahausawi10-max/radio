const CACHE_NAME = 'arab-hausa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/liquid-glass.css',
  '/js/app.js',
  '/js/pwa-install.js',
  '/images/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Never cache audio streams or dynamic API requests
  const url = event.request.url;
  if (url.includes('/api/') || url.includes('.m3u8') || url.includes('stream') || url.includes('.aac') || url.includes('.mp3')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
