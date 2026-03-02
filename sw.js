/* Service Worker - NSK Lag v77 */
const CACHE_NAME = "nsklag-v77-cache";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.webmanifest",
  // valfri logga:
  "./nsk-logo.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // cache.addAll failar om någon fil saknas, så vi gör "best effort"
    for (const url of ASSETS) {
      try { await cache.add(url); } catch { /* ignore */ }
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      // lägg i cache om GET
      if (req.method === "GET") {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone()).catch(()=>{});
      }
      return fresh;
    } catch {
      // fallback to app shell
      const shell = await caches.match("./index.html");
      return shell || new Response("Offline", { status: 503 });
    }
  })());
});