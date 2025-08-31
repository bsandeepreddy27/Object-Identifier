const CACHE_NAME = 'object-identifier-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  // Note: You should create and add paths to your icons here if you want them cached on install
  // './icon-192x192.png',
  // './icon-512x512.png'
];

// Install event: open cache and add app shell to it
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  const url = new URL(event.request.url);
  // Don't cache API calls to Google AI
  if (url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchedResponsePromise = fetch(event.request).then((networkResponse) => {
        // Check for a valid response to cache
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
          console.error('Service Worker: Fetch failed; returning cached response if available.', err);
          // If fetch fails (e.g., offline), and we have a cached response, we will have already returned it.
      });

      // Return cached response immediately if available, otherwise wait for network
      return cachedResponse || fetchedResponsePromise;
    })
  );
});