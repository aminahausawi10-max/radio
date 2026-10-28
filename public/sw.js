const CACHE_NAME = 'arab-hausa-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/liquid-glass.css?v=3',
  '/js/i18n.js?v=3',
  '/js/app.js?v=3',
  '/js/pwa-install.js?v=3',
  '/images/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Network first for HTML to always get latest changes
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Bypass API and streams
  if (url.includes('/api/') || url.includes('.m3u8') || url.includes('stream') || url.includes('.aac') || url.includes('.mp3')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
