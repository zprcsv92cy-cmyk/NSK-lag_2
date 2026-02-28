/* sw.js — v45 */
const CACHE = 'nsk-v45';

self.addEventListener('install', (event) => {
  // Aktivera direkt (minskar risken att fastna på gammal version)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Rensa alla gamla cache-namn (vxx)
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)));
    // Ta kontroll över alla öppna flikar direkt
    await self.clients.claim();
  })());
});

// Network-first för allt: alltid försök hämta senaste från nätet.
// Om offline: fall tillbaka till cache (om det finns).
self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    try {
      const res = await fetch(event.request, { cache: 'no-store' });

      // Spara GET-svar i cache (för offline)
      if (event.request.method === 'GET' && res && res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, res.clone()).catch(() => {});
      }

      return res;
    } catch (err) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw err;
    }
  })());
});

// Om appen skickar postMessage({type:'SKIP_WAITING'}) -> aktivera direkt
self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});