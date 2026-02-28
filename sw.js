/* sw.js - GitHub Pages-safe */
'use strict';

const CACHE_VERSION = 'latest-1';
const CACHE_NAME = `nsk-cache-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './app.css?v=latest',
  './app.js?v=latest',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

function toScopeURL(path){
  return new URL(path, self.registration.scope).toString();
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const reqs = ASSETS.map(p => new Request(toScopeURL(p), { cache: 'reload' }));
    await cache.addAll(reqs);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML){
    event.respondWith((async ()=>{
      try{
        const fresh = await fetch(req, { cache:'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(toScopeURL('./index.html'), fresh.clone()).catch(()=>{});
        return fresh;
      }catch{
        const cached = await caches.match(toScopeURL('./index.html'));
        return cached || new Response('Offline', {status:503, headers:{'content-type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  event.respondWith((async ()=>{
    const cached = await caches.match(req);
    if (cached) return cached;
    try{
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(()=>{});
      return fresh;
    }catch{
      return new Response('', {status:504});
    }
  })());
});