// Service Worker mínimo: solo habilita la instalación de la PWA.
// No cachea nada (network passthrough) para evitar contenido obsoleto.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Passthrough a la red, sin caché.
  event.respondWith(fetch(event.request))
})
