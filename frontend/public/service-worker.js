/**
 * Service Worker for Spirit Tours PWA
 * Handles offline functionality, caching, and push notifications
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `spirit-tours-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
];

// API routes to cache
const API_CACHE_PATTERNS = [
  '/api/v1/tours',
  '/api/v1/bookings',
  '/api/v1/customers',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[Service Worker] Installed successfully');
      return self.skipWaiting(); // Activate immediately
    }).catch((error) => {
      console.error('[Service Worker] Installation failed:', error);
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[Service Worker] Activated successfully');
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Network-first strategy for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response before caching
          const responseClone = response.clone();
          
          // Cache successful API responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Serving from cache (offline):', request.url);
              return cachedResponse;
            }
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            return new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[Service Worker] Serving from cache:', request.url);
        return cachedResponse;
      }
      
      // Fetch from network and cache
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        
        return response;
      }).catch((error) => {
        console.error('[Service Worker] Fetch failed:', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let notificationData = {
    title: 'Spirit Tours',
    body: 'You have a new notification',
    icon: '/logo192.png',
    badge: '/badge.png',
    tag: 'default',
    requireInteraction: false,
  };
  
  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() };
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions || [],
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
  // Navigate to app or specific URL
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
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

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncAllData());
  }
});

// Sync bookings function
async function syncBookings() {
  try {
    // Get pending bookings from IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending_bookings', 'readonly');
    const store = tx.objectStore('pending_bookings');
    const pendingBookings = await store.getAll();
    
    // Sync each booking
    for (const booking of pendingBookings) {
      try {
        const response = await fetch('/api/v1/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(booking.data),
        });
        
        if (response.ok) {
          // Remove from pending after successful sync
          const txDelete = db.transaction('pending_bookings', 'readwrite');
          const storeDelete = txDelete.objectStore('pending_bookings');
          await storeDelete.delete(booking.id);
          
          console.log('[Service Worker] Booking synced:', booking.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync booking:', error);
      }
    }
    
    console.log('[Service Worker] Bookings sync completed');
  } catch (error) {
    console.error('[Service Worker] Bookings sync failed:', error);
  }
}

// Sync all data function
async function syncAllData() {
  try {
    console.log('[Service Worker] Syncing all data...');
    
    // Sync tours
    await fetch('/api/v1/tours').then((response) => response.json());
    
    // Sync bookings
    await fetch('/api/v1/bookings').then((response) => response.json());
    
    // Sync customers
    await fetch('/api/v1/customers').then((response) => response.json());
    
    console.log('[Service Worker] All data synced successfully');
  } catch (error) {
    console.error('[Service Worker] Data sync failed:', error);
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('spirit-tours-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('pending_bookings')) {
        db.createObjectStore('pending_bookings', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('offline_data')) {
        db.createObjectStore('offline_data', { keyPath: 'key' });
      }
    };
  });
}

// Message event - communicate with app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        return caches.open(CACHE_NAME);
      })
    );
  }
});

console.log('[Service Worker] Loaded successfully');
