/* NSK Lag v78 Service Worker */
const CACHE_NAME = "nsklag-v78-cache";

const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.webmanifest",
  "./nsk-logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of ASSETS) {
      try { await cache.add(url); } catch {}
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
  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const fresh = await fetch(event.request);
      if (event.request.method === "GET") {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone()).catch(()=>{});
      }
      return fresh;
    } catch {
      const shell = await caches.match("./index.html");
      return shell || new Response("Offline", { status: 503 });
    }
  })());
});