const CACHE = "nsk-v70";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        "./",
        "./index.html",
        "./app.js",
        "./app.css",
        "./manifest.webmanifest",
        "./icon-192.png",
        "./icon-512.png"
      ])
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});