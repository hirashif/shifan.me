// Kill-switch service worker.
// The previous site (GitProfile, vite-plugin-pwa) registered a worker at this URL
// that precached its index.html, so returning visitors kept seeing the old site.
// This replaces it: clear every cache, unregister, and reload open tabs once.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
