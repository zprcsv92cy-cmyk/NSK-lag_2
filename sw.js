const CACHE = "nsk-v60";

self.addEventListener("install",e=>{
self.skipWaiting();
e.waitUntil(
caches.open(CACHE).then(cache=>cache.addAll([
"./",
"./index.html",
"./app.js",
"./app.css"
]))
);
});

self.addEventListener("activate",e=>{
e.waitUntil(
caches.keys().then(keys=>{
return Promise.all(
keys.map(k=>{
if(k!==CACHE) return caches.delete(k);
})
);
})
);
self.clients.claim();
});

self.addEventListener("fetch",e=>{
e.respondWith(
fetch(e.request).catch(()=>caches.match(e.request))
);
});