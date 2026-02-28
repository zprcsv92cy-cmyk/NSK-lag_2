/* sw.js - GitHub Pages-safe (scope-relative) */
'use strict';

// Bump this when you deploy a new version
const CACHE_VERSION = 'v66';
const CACHE_NAME = `nsk-cache-${CACHE_VERSION}`;

// Files to cache relative to the Service Worker scope (works for /repo/ and /)
const ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Helper: build absolute URLs under the SW scope
function toScopeURL(path){
  return new URL(path, self.registration.scope).toString();
}

self.addEventListener('install', (event) => {
  // Activate updated SW immediately
  self.skipWaiting();

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Cache with absolute, scope-based URLs to avoid path issues on GitHub Pages
    const requests = ASSETS.map(p => new Request(toScopeURL(p), { cache: 'reload' }));
    await cache.addAll(requests);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean old caches
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Strategy:
// - HTML navigations: network-first, fallback to cached index.html (SPA-friendly on GH Pages)
// - Other assets: cache-first, then network
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith((async () => {
      try {
        // Network first for newest HTML
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        // Always update cached index.html (scope-relative)
        cache.put(toScopeURL('./index.html'), fresh.clone()).catch(()=>{});
        return fresh;
      } catch (e) {
        // Offline fallback: cached index.html
        const cached = await caches.match(toScopeURL('./index.html'));
        return cached || new Response('Offline', {
          status: 503,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // Assets: cache first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(()=>{});
      return fresh;
    } catch (e) {
      return new Response('', { status: 504 });
    }
  })());
});
