/* Gridfall PWA service worker: app shell + runtime cache. */
'use strict';

const CACHE = 'gridfall-pwa-v1';
const HOME = new URL('./', self.location).href;
const SHELL = new URL('./index.html', self.location).href;
const PRECACHE = [
  HOME,
  SHELL,
  new URL('./manifest.webmanifest', self.location).href,
  new URL('./pwa.js', self.location).href,
  new URL('./assets/icons/icon-192.png', self.location).href,
  new URL('./assets/icons/icon-512.png', self.location).href,
  new URL('./assets/icons/icon-maskable-192.png', self.location).href,
  new URL('./assets/icons/icon-maskable-512.png', self.location).href,
  new URL('./assets/icons/apple-touch-icon.png', self.location).href
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('gridfall-') && key !== CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function offlineResponse() {
  return new Response('Gridfall 暂时离线，请联网后再试。', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    return (await cache.match(request)) ||
      (await cache.match(SHELL)) ||
      (await cache.match(HOME)) ||
      offlineResponse();
  }
}

function staleWhileRevalidate(event) {
  return caches.open(CACHE).then((cache) =>
    cache.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.ok) {
          cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      }).catch(() => null);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return network.then((response) => response || offlineResponse());
    })
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;
  if (request.headers.get('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event));
});