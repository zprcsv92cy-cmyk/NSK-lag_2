/* sw.js v63 */
'use strict';

const CACHE_NAME = 'nsk-lag-cache-v63';
const CORE_ASSETS = [
  './',
  './index.html',
  './app.css?v=63',
  './app.js?v=63',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event)=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(()=>{})
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event)=>{
  if (event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event)=>{
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  const accept = req.headers.get('accept') || '';

  // HTML: network first
  if (accept.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/' ){
    event.respondWith((async ()=>{
      try{
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone()).catch(()=>{});
        return fresh;
      }catch{
        const cached = await caches.match(req);
        return cached || caches.match('./index.html');
      }
    })());
    return;
  }

  // assets: cache first
  event.respondWith((async ()=>{
    const cached = await caches.match(req);
    if (cached) return cached;
    try{
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(()=>{});
      return fresh;
    }catch{
      return cached;
    }
  })());
});