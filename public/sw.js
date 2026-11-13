/* global self, caches, fetch, URL */
const cacheName = 'deardaily-static-v1'
const offlineAssets = ['/offline.html', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(offlineAssets)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name.startsWith('deardaily-static-') && name !== cacheName,
            )
            .map((name) => caches.delete(name)),
        ),
      ),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(cacheName).then((cache) => cache.match('/offline.html')),
      ),
    )
    return
  }
  if (url.search || request.headers.has('authorization')) return
  if (!offlineAssets.includes(url.pathname)) return
  event.respondWith(
    caches
      .open(cacheName)
      .then((cache) =>
        cache
          .match(url.pathname)
          .then((response) => response ?? fetch(request)),
      ),
  )
})
