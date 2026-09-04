// Kill-switch service worker.
// The site now redirects to https://shifan.me. This file must keep existing at
// this exact URL so any browser still holding a stale worker registration here
// (from the GitProfile/vite-plugin-pwa era, or the prior kill-switch) fetches
// it on update, runs activate, clears every cache, unregisters, and reloads
// open tabs into the redirect — instead of being stuck serving cached old
// content forever. It is not registered from anywhere on this site itself.
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
