// Minimal Service Worker to satisfy PWA install criteria
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Respond with the network request to prevent Chrome's "no-op fetch handler" warning.
  event.respondWith(
    fetch(event.request).catch(() => {
      // If offline and request is for page navigation, return a friendly offline message.
      if (event.request.mode === 'navigate') {
        return new Response("No tienes conexión a internet en este momento.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      return new Response("", { status: 408 });
    })
  );
});

