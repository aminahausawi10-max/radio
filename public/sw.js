const CACHE_NAME = 'arab-hausa-cache-v60';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/css/liquid-glass.css',
  '/css/media.css',
  '/js/app.js',
  '/js/i18n.js',
  '/js/media-embed.js',
  '/js/pwa-install.js',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
  '/images/logo.png',
  '/images/logo-circle.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of CORE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Non-blocking asset fetch
        }
      }
    })
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
  const url = event.request.url;

  // 1. Strictly bypass Admin, API endpoints, dynamic event feeds, video streams, audio streams, uploads, and byte-ranges
  if (
    url.includes('/admin') ||
    url.includes('/js/admin') ||
    url.includes('/css/admin') ||
    url.includes('/api/') ||
    url.includes('/api-php/') ||
    url.includes('/data/') ||
    url.includes('/uploads/') ||
    url.includes('.json') ||
    url.includes('.m3u8') ||
    url.includes('.ts') ||
    url.includes('stream') ||
    url.includes('.aac') ||
    url.includes('.mp3') ||
    url.includes('.mp4') ||
    url.includes('.webm') ||
    url.includes('.mov') ||
    url.includes('.mkv') ||
    url.includes('hls.js') ||
    event.request.headers.get('range')
  ) {
    return;
  }

  // 2. HTML Navigation Requests: Network with fast 1.5s fallback to Cache (Guarantees zero blank pages)
  if (event.request.mode === 'navigate' || url.endsWith('/') || url.includes('/index.html')) {
    event.respondWith(
      new Promise((resolve) => {
        let hasResolved = false;
        const timeoutId = setTimeout(async () => {
          if (!hasResolved) {
            hasResolved = true;
            const cached = (await caches.match(event.request)) || (await caches.match('/')) || (await caches.match('/index.html'));
            if (cached) resolve(cached);
          }
        }, 1500);

        fetch(event.request)
          .then((networkResponse) => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(timeoutId);
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
              resolve(networkResponse);
            }
          })
          .catch(async () => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(timeoutId);
              const cached = (await caches.match(event.request)) || (await caches.match('/')) || (await caches.match('/index.html'));
              if (cached) resolve(cached);
            }
          });
      })
    );
    return;
  }

  // 3. Core CSS and Scripts: Network-first with immediate cache fallback (Guarantees latest code on refresh)
  if (url.includes('/css/') || url.includes('/js/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          return (await caches.match(event.request)) || (await caches.match(event.request, { ignoreSearch: true }));
        })
    );
    return;
  }

  // 4. Static Images and Icons: Cache-first with background revalidation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
