/* v50 SW */
const CACHE = "nsk-cache-v50";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async()=>{
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith((async()=>{
    // Network first for HTML, so updates propagate faster
    if (req.mode === "navigate" || (req.headers.get("accept")||"").includes("text/html")){
      try{
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match("./index.html")) || (await cache.match("./")) || Response.error();
      }
    }

    // Cache-first for assets
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;

    try{
      const fresh = await fetch(req);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return Response.error();
    }
  })());
});