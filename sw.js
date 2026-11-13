const cacheName = 'cherry-v6';
const assets = ['./', './style.css', './app.js', './cat.png', './dog.png', './rabbit.png', './icon.png', './app.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('cherry-') && key !== cacheName).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request).catch(async () => (await caches.match(event.request)) || Response.error()));
  }
});
