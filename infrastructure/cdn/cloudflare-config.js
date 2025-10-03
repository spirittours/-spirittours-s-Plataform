/**
 * Cloudflare CDN Configuration for Spirit Tours
 * Optimizes asset delivery with edge caching and performance enhancements
 */

const CLOUDFLARE_CONFIG = {
  // Zone settings
  zone: {
    id: process.env.CLOUDFLARE_ZONE_ID,
    name: 'spirittours.com',
    plan: 'enterprise',
  },

  // CDN settings
  cdn: {
    enabled: true,
    cacheLevel: 'aggressive',
    browserCacheTTL: 14400, // 4 hours
    edgeCacheTTL: 86400, // 24 hours
    alwaysOnline: true,
  },

  // Performance optimizations
  performance: {
    minify: {
      javascript: true,
      css: true,
      html: true,
    },
    brotli: true,
    autoMinimize: true,
    http2: true,
    http3: true,
    earlyHints: true,
    rocketLoader: true,
    mirage: true, // Image optimization
    polish: 'lossless', // Image compression
    webp: true, // Auto WebP conversion
  },

  // Security settings
  security: {
    waf: true,
    ddosProtection: true,
    botManagement: true,
    challengePassage: 1800,
    securityLevel: 'medium',
    ssl: {
      mode: 'full_strict',
      minVersion: 'TLSv1.2',
      opportunisticEncryption: true,
      automaticHTTPSRewrites: true,
    },
  },

  // Page Rules
  pageRules: [
    {
      target: '*/api/*',
      actions: {
        cacheLevel: 'bypass',
        securityLevel: 'high',
      },
    },
    {
      target: '*/static/*',
      actions: {
        cacheLevel: 'cache_everything',
        edgeCacheTTL: 2592000, // 30 days
        browserCacheTTL: 604800, // 7 days
      },
    },
    {
      target: '*/images/*',
      actions: {
        cacheLevel: 'cache_everything',
        edgeCacheTTL: 2592000, // 30 days
        polish: 'lossless',
        mirage: true,
        webp: true,
      },
    },
    {
      target: '*/fonts/*',
      actions: {
        cacheLevel: 'cache_everything',
        edgeCacheTTL: 31536000, // 1 year
        browserCacheTTL: 31536000, // 1 year
      },
    },
  ],

  // Workers configuration
  workers: {
    routes: [
      {
        pattern: '*/api/optimize/*',
        script: 'image-optimizer',
      },
      {
        pattern: '*/api/geo/*',
        script: 'geo-router',
      },
    ],
  },

  // Argo Smart Routing
  argo: {
    smartRouting: true,
    tieredCaching: true,
  },

  // Analytics
  analytics: {
    webAnalytics: true,
    rumAnalytics: true,
  },
};

// Cloudflare Worker for image optimization
const IMAGE_OPTIMIZER_WORKER = `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const imageURL = url.searchParams.get('url')
  
  if (!imageURL) {
    return new Response('Missing image URL', { status: 400 })
  }
  
  const accept = request.headers.get('Accept')
  const isWebPSupported = accept && accept.includes('webp')
  
  // Fetch original image
  const imageRequest = new Request(imageURL, {
    headers: {
      'Accept': isWebPSupported ? 'image/webp' : 'image/*'
    }
  })
  
  const response = await fetch(imageRequest, {
    cf: {
      image: {
        fit: 'scale-down',
        width: url.searchParams.get('w') || undefined,
        height: url.searchParams.get('h') || undefined,
        quality: url.searchParams.get('q') || 85,
        format: isWebPSupported ? 'webp' : 'auto',
      },
      cacheEverything: true,
      cacheTtl: 86400,
    },
  })
  
  // Add cache headers
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Vary', 'Accept')
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}
`;

// Cloudflare Worker for geo-based routing
const GEO_ROUTER_WORKER = `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const country = request.cf.country
  const continent = request.cf.continent
  const city = request.cf.city
  
  // Define region-specific endpoints
  const endpoints = {
    'EU': 'https://eu.api.spirittours.com',
    'NA': 'https://us.api.spirittours.com',
    'AS': 'https://asia.api.spirittours.com',
    'default': 'https://api.spirittours.com'
  }
  
  const endpoint = endpoints[continent] || endpoints.default
  
  // Forward request to appropriate endpoint
  const url = new URL(request.url)
  url.hostname = new URL(endpoint).hostname
  
  const modifiedRequest = new Request(url, request)
  modifiedRequest.headers.set('CF-Connecting-IP', request.headers.get('CF-Connecting-IP'))
  modifiedRequest.headers.set('X-Country', country)
  modifiedRequest.headers.set('X-City', city || 'Unknown')
  
  return fetch(modifiedRequest)
}
`;

// Asset optimization configuration
const ASSET_OPTIMIZATION = {
  images: {
    formats: ['webp', 'avif', 'jpg', 'png'],
    sizes: [320, 640, 768, 1024, 1366, 1920],
    quality: {
      webp: 85,
      avif: 80,
      jpg: 85,
      png: 95,
    },
    lazy: true,
    placeholder: 'blur',
  },
  
  css: {
    critical: true, // Extract critical CSS
    purge: true, // Remove unused CSS
    minify: true,
    inline: {
      threshold: 10000, // Inline CSS smaller than 10KB
    },
  },
  
  javascript: {
    splitting: true, // Code splitting
    chunks: {
      vendor: ['react', 'react-dom', 'redux'],
      common: true,
      async: true,
    },
    minify: true,
    sourceMap: false, // Disable in production
    treeshake: true,
  },
  
  fonts: {
    preload: [
      '/fonts/Roboto-Regular.woff2',
      '/fonts/Roboto-Bold.woff2',
    ],
    display: 'swap',
    subset: true, // Font subsetting for used characters
  },
  
  prefetch: [
    '/api/tours/popular',
    '/api/categories',
  ],
  
  preconnect: [
    'https://api.spirittours.com',
    'https://fonts.googleapis.com',
    'https://www.googletagmanager.com',
  ],
};

// Cache headers configuration
const CACHE_HEADERS = {
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Vary': 'Accept-Encoding',
  },
  
  images: {
    'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
    'Vary': 'Accept, Accept-Encoding',
  },
  
  api: {
    'Cache-Control': 'private, max-age=0, no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  
  html: {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    'Vary': 'Accept-Encoding',
  },
};

// Service Worker for offline support
const SERVICE_WORKER = `
const CACHE_NAME = 'spirit-tours-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/offline.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
`;

module.exports = {
  CLOUDFLARE_CONFIG,
  IMAGE_OPTIMIZER_WORKER,
  GEO_ROUTER_WORKER,
  ASSET_OPTIMIZATION,
  CACHE_HEADERS,
  SERVICE_WORKER,
};