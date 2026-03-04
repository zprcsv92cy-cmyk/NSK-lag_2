/* NSK Lag v79 Service Worker */
const CACHE_NAME="nsklag-v79-cache";
const ASSETS=["./","./index.html","./app.css","./app.js","./manifest.webmanifest","./nsk-logo.png","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",e=>e.waitUntil((async()=>{const c=await caches.open(CACHE_NAME);for(const u of ASSETS){try{await c.add(u)}catch{}}self.skipWaiting();})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)));self.clients.claim();})()));
self.addEventListener("fetch",e=>e.respondWith((async()=>{
  const cached=await caches.match(e.request,{ignoreSearch:true}); if(cached) return cached;
  try{
    const fresh=await fetch(e.request);
    if(e.request.method==="GET"){const c=await caches.open(CACHE_NAME); c.put(e.request,fresh.clone()).catch(()=>{});}
    return fresh;
  }catch{
    const shell=await caches.match("./index.html"); return shell||new Response("Offline",{status:503});
  }
})()));
