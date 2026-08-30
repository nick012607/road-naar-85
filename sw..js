const CACHE = 'road-naar-85-v2';

const APP_SHELL = [
  './',
  './index.html',
  './nick.html',
  './victor.html',
  './manifest.json',
  './manifest-nick.json',
  './manifest-victor.json',
  './assets/styles.css',
  './assets/config.js',
  './assets/core.js',
  './assets/charts.js',
  './assets/compare.js',
  './assets/person.js',
  './assets/pwa.js',
  './assets/icon-512.png',
  './assets/icon-nick-512.png',
  './assets/icon-victor-512.png'
  ];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
    // Per bestand cachen: één ontbrekend bestand mag de hele install niet slopen.
    .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
    .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Wegingen komen uit Supabase — nooit uit cache serveren, altijd vers.
  if (req.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => cached);
      return cached || network;
    })
    );
});
