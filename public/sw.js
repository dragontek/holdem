/* Jack Ten Poker — Production PWA Service Worker */
const CACHE_VERSION = 'jackten-pwa-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== APP_SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isBypassRequest(request, url) {
  if (request.method !== 'GET') return true;
  if (url.origin !== self.location.origin) return true;
  // Never cache Appwrite API, realtime sockets, or auth endpoints
  if (url.pathname.startsWith('/v1/') || url.pathname.includes('/realtime')) {
    return true;
  }
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isBypassRequest(request, url)) {
    return;
  }

  // SPA navigation requests: Network-first with cached index.html fallback for offline resilience
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(APP_SHELL_CACHE).then((cache) => {
              cache.put('/index.html', copy).catch(() => {});
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedShell =
            (await caches.match('/index.html')) || (await caches.match('/'));
          return (
            cachedShell ||
            new Response('Offline — please reconnect to load Jack Ten Poker.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        })
    );
    return;
  }

  // Static built assets (/assets/*, icons, manifest): Stale-while-revalidate
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/manifest.webmanifest';

  if (isStaticAsset) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.ok && response.type === 'basic') {
              cache.put(request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }
        const networkResponse = await networkPromise;
        return networkResponse || new Response('', { status: 504 });
      })
    );
  }
});
