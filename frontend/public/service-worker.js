// Spirit Tours - Service Worker
// Version: 1.0.0
// PWA offline support and caching strategy

const CACHE_NAME = 'spirit-tours-v1';
const API_CACHE_NAME = 'spirit-tours-api-v1';
const IMAGE_CACHE_NAME = 'spirit-tours-images-v1';

// Resources to cache immediately
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/offline.html'
];

// API routes that should be cached
const API_ROUTES = [
  '/api/v1/tours',
  '/api/v1/destinations'
];

// ============================================
// Install Event - Cache Resources
// ============================================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching resources');
      return cache.addAll(PRECACHE_RESOURCES);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// ============================================
// Activate Event - Clean Old Caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== CACHE_NAME && 
                   name !== API_CACHE_NAME && 
                   name !== IMAGE_CACHE_NAME;
          })
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Take control immediately
  return self.clients.claim();
});

// ============================================
// Fetch Event - Network Strategies
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // API Requests - Network First, Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
    return;
  }
  
  // Images - Cache First, Network Fallback
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE_NAME));
    return;
  }
  
  // HTML/CSS/JS - Stale While Revalidate
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(staleWhileRevalidateStrategy(request, CACHE_NAME));
    return;
  }
  
  // Default - Network First
  event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

// ============================================
// Caching Strategies
// ============================================

// Network First - Try network, fallback to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    return new Response('Network error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Cache First - Try cache, fallback to network
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Cache and network failed:', error);
    return new Response('Resource not available', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Stale While Revalidate - Return cache immediately, update in background
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// ============================================
// Background Sync
// ============================================
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
});

async function syncBookings() {
  // Sync offline bookings when back online
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const cachedRequests = await cache.keys();
    
    for (const request of cachedRequests) {
      if (request.method === 'POST') {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// ============================================
// Push Notifications
// ============================================
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');
  
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  const title = data.title || 'Spirit Tours';
  const options = {
    body: data.body || 'New notification',
    icon: '/logo192.png',
    badge: '/badge-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Open',
        icon: '/icons/open.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          // Check if there's already a window open
          for (let client of windowClients) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window if none exists
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// ============================================
// Message Handler
// ============================================
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urlsToCache = event.data.payload;
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache);
      })
    );
  }
});
