/**
 * Service Worker for HireFlux PWA
 * Issue #143: Progressive Web App Support
 *
 * Features:
 * - Precaching critical assets
 * - Runtime caching strategies
 * - Offline fallback
 * - Push notification handling
 * - Cache versioning and cleanup
 */

const CACHE_VERSION = 'v1';
const PRECACHE_NAME = `hireflux-precache-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `hireflux-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `hireflux-images-${CACHE_VERSION}`;

// Assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
];

// Cache size limits
const MAX_RUNTIME_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 60;

/**
 * ============================================================================
 * INSTALL EVENT - Precache critical assets
 * ============================================================================
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(PRECACHE_NAME);
        await cache.addAll(PRECACHE_URLS);
        console.log('[ServiceWorker] Precached assets');

        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error('[ServiceWorker] Precache failed:', error);
      }
    })()
  );
});

/**
 * ============================================================================
 * ACTIVATE EVENT - Clean up old caches
 * ============================================================================
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event');

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const cachesToDelete = cacheNames.filter((cacheName) => {
          return (
            cacheName.startsWith('hireflux-') &&
            !cacheName.includes(CACHE_VERSION)
          );
        });

        await Promise.all(cachesToDelete.map((cacheName) => caches.delete(cacheName)));

        if (cachesToDelete.length > 0) {
          console.log('[ServiceWorker] Deleted old caches:', cachesToDelete);
        }

        // Take control of all clients immediately
        await self.clients.claim();
      } catch (error) {
        console.error('[ServiceWorker] Activation failed:', error);
      }
    })()
  );
});

/**
 * ============================================================================
 * FETCH EVENT - Caching strategies
 * ============================================================================
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Route to appropriate caching strategy
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAssetRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

/**
 * ============================================================================
 * CACHING STRATEGIES
 * ============================================================================
 */

/**
 * Cache-first strategy for images
 * Returns cached image if available, otherwise fetches and caches
 */
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      // Clone the response before caching
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);

      // Enforce cache size limit
      await enforceCacheLimit(IMAGE_CACHE_NAME, MAX_IMAGE_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Image request failed:', error);
    // Return fallback image
    return new Response('', { status: 404, statusText: 'Image not found' });
  }
}

/**
 * Network-first strategy for API requests
 * Tries network first, falls back to cache if offline
 */
async function handleAPIRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);

    const cache = await caches.open(RUNTIME_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. Please try again when connected.',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Cache-first strategy for static assets (JS, CSS)
 * Returns cached asset if available, otherwise fetches and caches
 */
async function handleStaticAssetRequest(request) {
  try {
    const cache = await caches.open(RUNTIME_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);

      await enforceCacheLimit(RUNTIME_CACHE_NAME, MAX_RUNTIME_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Static asset request failed:', error);
    return new Response('', { status: 404, statusText: 'Asset not found' });
  }
}

/**
 * Network-first strategy for navigation requests
 * Tries network first, falls back to cache, then offline page
 */
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Navigation request failed, trying cache:', request.url);

    const cache = await caches.open(RUNTIME_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    const offlineResponse = await cache.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }

    // Last resort: simple offline message
    return new Response(
      \`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - HireFlux</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background: #f9fafb;
            }
            .offline-container {
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #1f2937; margin-bottom: 16px; }
            p { color: #6b7280; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="offline-container" data-offline-page>
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
          </div>
        </body>
      </html>\`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  return request.destination === 'image' ||
         /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(request.url);
}

/**
 * Check if request is for an API
 */
function isAPIRequest(request) {
  return request.url.includes('/api/');
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  return request.destination === 'script' ||
         request.destination === 'style' ||
         /\.(js|css|woff2?|ttf|eot)$/i.test(request.url);
}

/**
 * Enforce cache size limit by removing oldest entries
 */
async function enforceCacheLimit(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxItems) {
      // Remove oldest items (FIFO)
      const itemsToDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(itemsToDelete.map((key) => cache.delete(key)));
    }
  } catch (error) {
    console.error('[ServiceWorker] Cache limit enforcement failed:', error);
  }
}

/**
 * ============================================================================
 * PUSH NOTIFICATIONS
 * ============================================================================
 */

/**
 * Handle push notification received
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');

  let notificationData = {
    title: 'HireFlux',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {},
  };

  try {
    if (event.data) {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
      };
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to parse push data:', error);
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      try {
        // Check if there's already a window open
        const windowClients = await clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        // If a window is already open, focus it and navigate
        for (const client of windowClients) {
          if ('focus' in client) {
            await client.focus();
            if (client.url !== urlToOpen && 'navigate' in client) {
              return await client.navigate(urlToOpen);
            }
            return;
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          return await clients.openWindow(urlToOpen);
        }
      } catch (error) {
        console.error('[ServiceWorker] Notification click handler failed:', error);
      }
    })()
  );
});

/**
 * ============================================================================
 * MESSAGE HANDLING
 * ============================================================================
 */

/**
 * Handle messages from clients (app)
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name.startsWith('hireflux-'))
            .map((name) => caches.delete(name))
        );
        console.log('[ServiceWorker] All caches cleared');
      })()
    );
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

console.log('[ServiceWorker] Loaded successfully');
