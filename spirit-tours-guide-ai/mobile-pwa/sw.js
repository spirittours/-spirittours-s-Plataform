/**
 * Service Worker para PWA
 * Proporciona funcionalidad offline, cache inteligente y push notifications
 */

const CACHE_VERSION = 'spirit-tours-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Recursos estáticos para cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/css/main.css',
  '/js/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge.png',
  '/icons/info.png',
  '/icons/success.png',
  '/icons/warning.png',
  '/icons/alert.png',
  '/icons/location.png',
  '/icons/event.png'
];

// Estrategias de cache
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Configuración de rutas y estrategias
const ROUTE_CONFIG = [
  {
    pattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cache: IMAGE_CACHE,
    expiration: 30 * 24 * 60 * 60 * 1000 // 30 días
  },
  {
    pattern: /\.(?:js|css|woff|woff2|ttf|eot)$/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cache: STATIC_CACHE
  },
  {
    pattern: /^https:\/\/api\./,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cache: API_CACHE,
    timeout: 5000
  },
  {
    pattern: /^https:\/\/.*\.tile\.openstreetmap\.org/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cache: IMAGE_CACHE,
    expiration: 7 * 24 * 60 * 60 * 1000 // 7 días
  }
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Instalación completada');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Error en instalación:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Eliminar caches antiguos
              return cacheName.startsWith('spirit-tours-') && 
                     cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== IMAGE_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map(cacheName => {
              console.log('[SW] Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activación completada');
        return self.clients.claim();
      })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones no HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Buscar estrategia de cache para esta ruta
  const routeConfig = ROUTE_CONFIG.find(config => 
    config.pattern.test(request.url)
  );

  if (routeConfig) {
    event.respondWith(
      handleRequest(request, routeConfig)
    );
  } else {
    // Estrategia por defecto: Network First
    event.respondWith(
      networkFirst(request, DYNAMIC_CACHE)
    );
  }
});

/**
 * Maneja la petición según la estrategia configurada
 */
async function handleRequest(request, config) {
  const { strategy, cache, timeout, expiration } = config;

  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cache, expiration);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cache, timeout);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cache);
    
    case CACHE_STRATEGIES.CACHE_ONLY:
      return cacheOnly(request, cache);
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return networkOnly(request);
    
    default:
      return networkFirst(request, cache);
  }
}

/**
 * Cache First: Intenta cache primero, luego red
 */
async function cacheFirst(request, cacheName, expiration) {
  const cached = await caches.match(request);
  
  if (cached) {
    // Verificar expiración si está configurada
    if (expiration) {
      const cachedTime = new Date(cached.headers.get('sw-cached-time'));
      const now = new Date();
      
      if (now - cachedTime > expiration) {
        // Cache expirado, obtener de red
        return fetchAndCache(request, cacheName);
      }
    }
    
    return cached;
  }

  return fetchAndCache(request, cacheName);
}

/**
 * Network First: Intenta red primero, fallback a cache
 */
async function networkFirst(request, cacheName, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      await cacheResponse(request, response.clone(), cacheName);
    }

    return response;

  } catch (error) {
    const cached = await caches.match(request);
    
    if (cached) {
      return cached;
    }

    // Si no hay cache y estamos offline, retornar página offline
    if (!navigator.onLine) {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    throw error;
  }
}

/**
 * Stale While Revalidate: Retorna cache, actualiza en background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cacheResponse(request, response.clone(), cacheName);
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

/**
 * Cache Only: Solo retorna del cache
 */
async function cacheOnly(request, cacheName) {
  return await caches.match(request);
}

/**
 * Network Only: Solo de la red
 */
async function networkOnly(request) {
  return await fetch(request);
}

/**
 * Cachea una respuesta
 */
async function cacheResponse(request, response, cacheName) {
  const cache = await caches.open(cacheName);
  
  // Agregar timestamp al header para control de expiración
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);
  headers.append('sw-cached-time', new Date().toISOString());

  const modifiedResponse = new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers
  });

  await cache.put(request, modifiedResponse);
}

/**
 * Obtiene de red y cachea
 */
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      await cacheResponse(request, response.clone(), cacheName);
    }
    
    return response;
  } catch (error) {
    throw error;
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido');

  let notificationData = {};

  try {
    notificationData = event.data ? event.data.json() : {};
  } catch (error) {
    notificationData = {
      title: 'Spirit Tours',
      body: event.data ? event.data.text() : 'Nueva notificación'
    };
  }

  const {
    title = 'Spirit Tours',
    body = 'Tienes una nueva notificación',
    icon = '/icons/icon-192x192.png',
    badge = '/icons/badge.png',
    image,
    vibrate = [200, 100, 200],
    data = {},
    actions = [],
    requireInteraction = false
  } = notificationData;

  const options = {
    body,
    icon,
    badge,
    image,
    vibrate,
    data,
    actions,
    requireInteraction,
    tag: data.id || `notification-${Date.now()}`
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notificación clickeada
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada');

  event.notification.close();

  const { action, data } = event;

  // Manejar acciones
  if (action === 'rate') {
    event.waitUntil(
      clients.openWindow('/rate')
    );
  } else if (action === 'share') {
    event.waitUntil(
      clients.openWindow('/share')
    );
  } else if (action === 'like') {
    // Enviar mensaje al cliente para dar like
    event.waitUntil(
      sendMessageToClients({ type: 'like', data })
    );
  } else if (action === 'follow') {
    event.waitUntil(
      clients.openWindow('/social')
    );
  } else {
    // Acción por defecto: abrir la app
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          // Si hay una ventana abierta, enfocarla
          for (const client of clientList) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus();
            }
          }
          // Si no, abrir nueva ventana
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

/**
 * Envía mensaje a todos los clientes
 */
async function sendMessageToClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Sincronización en background
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronización en background');

  if (event.tag === 'sync-tour-data') {
    event.waitUntil(syncTourData());
  } else if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

/**
 * Sincroniza datos del tour
 */
async function syncTourData() {
  try {
    const response = await fetch('/api/tours/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('[SW] Datos sincronizados correctamente');
    }
  } catch (error) {
    console.error('[SW] Error sincronizando datos:', error);
    throw error;
  }
}

/**
 * Sincroniza notificaciones pendientes
 */
async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('[SW] Notificaciones sincronizadas');
    }
  } catch (error) {
    console.error('[SW] Error sincronizando notificaciones:', error);
    throw error;
  }
}

// Mensajes desde la app
self.addEventListener('message', (event) => {
  console.log('[SW] Mensaje recibido:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  } else if (event.data.type === 'PREFETCH_ROUTE') {
    event.waitUntil(prefetchRoute(event.data.route));
  }
});

/**
 * Limpia todos los caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

/**
 * Pre-cachea datos de una ruta
 */
async function prefetchRoute(routeData) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const resources = routeData.waypoints.map(wp => {
    return [
      `/api/perspectives/${wp.id}`,
      ...(wp.media?.images || []),
      ...(wp.media?.audio || [])
    ];
  }).flat();

  return Promise.all(
    resources.map(url => 
      fetch(url)
        .then(response => cache.put(url, response))
        .catch(() => {}) // Ignorar errores
    )
  );
}

console.log('[SW] Service Worker cargado');
