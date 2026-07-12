const CACHE_NAME = 'cohl-sales-tech-v9';
const ASSETS_TO_CACHE = [
  './index.html',
  './style.css',
  './hr_management.html',
  './runway_report.html',
  './VD_Sales.html',
  './V1_Sales.html',
  './VV_Sales.html',
  './OVCP_Sales.html',
  './TVCP_Sales.html',
  './VVCP_Sales.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});