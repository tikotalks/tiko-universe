// Tiko Admin is not a PWA. This file replaces any legacy service worker
// previously installed at /sw.js so stale precached admin bundles stop
// intercepting navigation requests.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientsList) {
        client.navigate(client.url)
      }
    })(),
  )
})
