const CACHE = "nsk-v56";

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        "./",
        "./index.html",
        "./app.js",
        "./app.css"
      ])
    )
  );
});


self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE)
            .map(k => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});


self.addEventListener("fetch", event => {

  if (event.request.mode === "navigate") {

    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match("./index.html"))
    );

    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(res => res || fetch(event.request))
  );

});


self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});