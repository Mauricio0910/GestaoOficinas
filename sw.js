const CACHE_NAME = 'oficinapro-os-v10-integracao-delphi-licenciamento';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-db.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './data/vehicle-catalog.sample.json',
  './data/inspection-catalog.sample.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith('/firebase-config.js')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
