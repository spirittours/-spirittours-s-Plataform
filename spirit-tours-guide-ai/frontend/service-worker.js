/**
 * Service Worker - Spirit Tours AI Guide
 * 
 * Implementa estrategias de caché y sincronización en background
 * para funcionalidad offline completa
 */

const CACHE_NAME = 'spirit-tours-v1';
const RUNTIME_CACHE = 'spirit-tours-runtime-v1';
const DATA_CACHE = 'spirit-tours-data-v1';

// Recursos estáticos para cachear durante instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js',
  '/offline.html'
];

// Estrategias de caché por tipo de recurso
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  CACHE_ONLY: 'cache-only',
  NETWORK_ONLY: 'network-only',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

/**
 * Install Event - Cachear recursos estáticos
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

/**
 * Activate Event - Limpiar cachés antiguos
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && 
                   cacheName !== RUNTIME_CACHE &&
                   cacheName !== DATA_CACHE;
          })
          .map((cacheName) => {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch Event - Interceptar requests y aplicar estrategias
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Determinar estrategia según tipo de recurso
  let strategy = determineStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
  );
});

/**
 * Determinar estrategia de caché según request
 */
function determineStrategy(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // API de datos - Network First (con fallback a caché)
  if (path.startsWith('/api/')) {
    if (path.includes('/offline/') || path.includes('/sync/')) {
      return CACHE_STRATEGIES.NETWORK_ONLY;
    }
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // Archivos estáticos - Cache First
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // HTML pages - Stale While Revalidate
  if (request.mode === 'navigate') {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Default - Network First
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

/**
 * Manejar request según estrategia
 */
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
      
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
      
    case CACHE_STRATEGIES.CACHE_ONLY:
      return cacheOnly(request);
      
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return networkOnly(request);
      
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
      
    default:
      return networkFirst(request);
  }
}

/**
 * Cache First Strategy
 * Intenta caché primero, luego network
 */
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network First Strategy
 * Intenta network primero, fallback a caché
 */
async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Retornar respuesta offline si es API
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          offline: true, 
          error: 'No network connection',
          message: 'You are offline. Changes will sync when connection is restored.'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Cache Only Strategy
 * Solo desde caché
 */
async function cacheOnly(request) {
  const cache = await caches.open(CACHE_NAME);
  return await cache.match(request) || new Response('Not in cache', { status: 404 });
}

/**
 * Network Only Strategy
 * Solo desde network
 */
async function networkOnly(request) {
  return await fetch(request);
}

/**
 * Stale While Revalidate Strategy
 * Retorna caché inmediatamente, actualiza en background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cached || fetchPromise;
}

/**
 * Background Sync Event
 * Sincronizar datos cuando vuelva conexión
 */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

/**
 * Sincronizar queue offline
 */
async function syncOfflineQueue() {
  try {
    // Obtener datos pendientes de IndexedDB
    const queue = await getOfflineQueue();
    
    if (queue.length === 0) {
      console.log('[ServiceWorker] No items to sync');
      return;
    }
    
    console.log(`[ServiceWorker] Syncing ${queue.length} items`);
    
    // Enviar al servidor
    const response = await fetch('/api/offline/sync/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: queue[0].userId,
        queueItems: queue
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[ServiceWorker] Sync successful:', result);
      
      // Limpiar queue
      await clearOfflineQueue();
      
      // Notificar clientes
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          data: result
        });
      });
    }
    
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
    throw error;
  }
}

/**
 * Obtener queue offline de IndexedDB
 */
async function getOfflineQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SpiritToursDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = () => {
        reject(getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Limpiar queue offline
 */
async function clearOfflineQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SpiritToursDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        resolve();
      };
      
      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Message Event - Comunicación con clientes
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    self.registration.sync.register('sync-offline-queue');
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    cacheUrls(event.data.urls);
  }
});

/**
 * Cachear URLs específicas
 */
async function cacheUrls(urls) {
  const cache = await caches.open(DATA_CACHE);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log('[ServiceWorker] Cached:', url);
      }
    } catch (error) {
      console.error('[ServiceWorker] Failed to cache:', url, error);
    }
  }
}

/**
 * Push Event - Notificaciones push
 */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.message || 'New update available',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Spirit Tours', options)
  );
});

/**
 * Notification Click Event
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[ServiceWorker] Loaded');
