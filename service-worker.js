const CACHE = 'piggy365-cache-v1';
const OFFLINE_URL = 'offline.html';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './ui.js',
  './generator.js',
  './storage.js',
  './animations.js',
  './manifest.json',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS.concat([OFFLINE_URL])))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(()=> caches.match(OFFLINE_URL))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(resp => resp || fetch(req).then(r=>{
      // cache new resources on the fly
      if (req.method === 'GET' && r && r.status===200 && r.type!=='opaque') {
        caches.open(CACHE).then(cache=>cache.put(req, r.clone()));
      }
      return r;
    }).catch(()=>caches.match(req)))
  );
});