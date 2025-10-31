/**
 * Spirit Tours PWA Service Worker
 * 
 * Provides:
 * - Offline functionality
 * - Cache management
 * - Background sync
 * - Push notifications
 * - Install prompts
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `spirit-tours-${CACHE_VERSION}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico',
];

// API endpoints to cache with network-first strategy
const API_CACHE_ENDPOINTS = [
  '/api/destinations/featured',
  '/api/destinations',
  '/api/products',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('spirit-tours-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - Network First strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - Cache First strategy
  event.respondWith(cacheFirstStrategy(request));
});

/**
 * Cache First Strategy
 * 
 * Try cache first, fallback to network if not found
 * Good for static assets that don't change often
 */
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[ServiceWorker] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.log('[ServiceWorker] Fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Fetch failed:', error);
    
    // Return offline page if available
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    return new Response('Offline - No cached content available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network First Strategy
 * 
 * Try network first, fallback to cache if offline
 * Good for dynamic content that should be fresh
 */
async function networkFirstStrategy(request) {
  try {
    console.log('[ServiceWorker] Network first:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Add custom header to indicate cached response
      const headers = new Headers(cachedResponse.headers);
      headers.append('X-Cached', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers,
      });
    }

    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No cached data available',
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
 * Background Sync
 * 
 * Queue failed requests to retry when online
 */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);

  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
});

async function syncBookings() {
  try {
    // Get pending bookings from IndexedDB
    const db = await openDatabase();
    const pendingBookings = await getPendingBookings(db);

    console.log('[ServiceWorker] Syncing bookings:', pendingBookings.length);

    for (const booking of pendingBookings) {
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(booking),
        });

        if (response.ok) {
          // Remove from pending queue
          await removePendingBooking(db, booking.id);
          console.log('[ServiceWorker] Booking synced:', booking.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync booking:', booking.id, error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
  }
}

/**
 * Push Notifications
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');

  let notificationData = {
    title: 'Spirit Tours',
    body: 'Nueva notificación',
    icon: '/logo192.png',
    badge: '/badge.png',
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      actions: notificationData.actions || [],
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Message handler for communication with clients
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      })
    );
  }

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

/**
 * IndexedDB helpers for offline storage
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('spirit-tours-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-bookings')) {
        db.createObjectStore('pending-bookings', { keyPath: 'id' });
      }
    };
  });
}

function getPendingBookings(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-bookings'], 'readonly');
    const store = transaction.objectStore('pending-bookings');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingBooking(db, bookingId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-bookings'], 'readwrite');
    const store = transaction.objectStore('pending-bookings');
    const request = store.delete(bookingId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

console.log('[ServiceWorker] Script loaded, version:', CACHE_VERSION);
