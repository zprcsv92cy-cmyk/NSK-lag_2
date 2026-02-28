/* sw.js — v48 */
'use strict';

const SW_VERSION = 'v48';
const CACHE_NAME = `nsk-cache-${SW_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async ()=>{
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async ()=>{
    const cache = await caches.open(CACHE_NAME);

    const accept = req.headers.get('accept') || '';
    const isHTML = accept.includes('text/html') || req.destination === 'document';

    if (isHTML){
      try{
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      }catch{
        const cached = await cache.match(req);
        if (cached) return cached;
        return cache.match('./index.html');
      }
    }

    const cached = await cache.match(req);
    if (cached) return cached;

    try{
      const fresh = await fetch(req);
      cache.put(req, fresh.clone());
      return fresh;
    }catch{
      return cached || Response.error();
    }
  })());
});
