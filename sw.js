/* sw.js v61 */
const CACHE_NAME = 'nsk-cache-v61';
const CORE = [
  './',
  './index.html',
  './app.js',
  './app.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // Network-first för HTML
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match('./index.html', { ignoreSearch: true });
        return cached || new Response('Offline', { status: 200 });
      }
    })());
    return;
  }

  // Assets: cache-first + revalidate, med ignoreSearch
  const isAsset = ['script','style','image','manifest'].includes(req.destination);
  if (isAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });

      const fetchPromise = fetch(req).then((fresh) => {
        cache.put(req, fresh.clone());
        return fresh;
      }).catch(() => null);

      return cached || (await fetchPromise) || new Response('', { status: 200 });
    })());
  }
});