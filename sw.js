// v60 SW — cache-bust + network-first HTML + clean old caches
const CACHE = "nsk-cache-v60";
const CORE = [
  "./",
  "./index.html",
  "./app.css?v=v60",
  "./app.js?v=v60",
  "./manifest.webmanifest?v=v60",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// Network-first for navigation/HTML to avoid “old html + new js” mix.
// Cache-first for static assets but ONLY from current CACHE (not any cache).
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  e.respondWith((async () => {
    if (isHTML) {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(CACHE);
        c.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        const c = await caches.open(CACHE);
        return (await c.match("./index.html")) || Response.error();
      }
    }

    // Same-origin asset
    if (url.origin === location.origin) {
      const c = await caches.open(CACHE);
      const cached = await c.match(req, { ignoreSearch: false });
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        c.put(req, fresh.clone());
        return fresh;
      } catch {
        return Response.error();
      }
    }

    // Cross-origin fallback
    return fetch(req);
  })());
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});