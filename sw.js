const CACHE = "nsk-v62";

self.addEventListener("install", e=>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll([
      "./",
      "./index.html",
      "./app.js?v=v62",
      "./app.css?v=v62",
      "./manifest.webmanifest?v=v62",
      "./icon-192.png",
      "./icon-512.png"
    ]))
  );
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k===CACHE ? null : caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e=>{
  const req=e.request;
  const isHTML = req.mode==="navigate" || (req.headers.get("accept")||"").includes("text/html");

  e.respondWith((async()=>{
    if (isHTML){
      try{
        const fresh = await fetch(req);
        const c = await caches.open(CACHE);
        c.put("./index.html", fresh.clone());
        return fresh;
      }catch{
        const c = await caches.open(CACHE);
        return (await c.match("./index.html")) || Response.error();
      }
    }
    const c = await caches.open(CACHE);
    const cached = await c.match(req);
    if (cached) return cached;
    try{
      const fresh = await fetch(req);
      c.put(req, fresh.clone());
      return fresh;
    }catch{
      return Response.error();
    }
  })());
});