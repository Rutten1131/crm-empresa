// Minimal Service Worker to satisfy PWA install criteria
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We don't cache assets dynamically to prevent routing issues and ensure
  // the client always receives the freshest code from Next.js server.
});
