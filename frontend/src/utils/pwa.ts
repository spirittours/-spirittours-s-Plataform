// Spirit Tours - PWA Utilities
// Progressive Web App helper functions
// Version: 1.0.0

/**
 * Register service worker
 */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available
                  showUpdateNotification();
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    });
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return registration.unregister();
    }
  }
  return false;
}

/**
 * Check if running as PWA
 */
export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if device supports PWA installation
 */
export function canInstallPWA(): boolean {
  return 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window;
}

/**
 * Show PWA install prompt
 */
export function showInstallPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    let deferredPrompt: any;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show custom install UI
      const installButton = document.getElementById('pwa-install-button');
      if (installButton) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User ${outcome} the install prompt`);
            deferredPrompt = null;
            installButton.style.display = 'none';
            resolve(outcome === 'accepted');
          }
        });
      }
    });
  });
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }
  
  const permission = await Notification.requestPermission();
  console.log('Notification permission:', permission);
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '')
    });
    
    console.log('Push subscription:', subscription);
    
    // Send subscription to server
    await fetch('/api/v1/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Notify server
      await fetch('/api/v1/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Cache URLs for offline access
 */
export async function cacheURLs(urls: string[]): Promise<void> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_URLS',
      payload: urls
    });
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('All caches cleared');
  }
}

/**
 * Get cache size
 */
export async function getCacheSize(): Promise<number> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
}

/**
 * Check online status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Add online/offline event listeners
 */
export function addConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Show update notification
 */
function showUpdateNotification(): void {
  const updateBanner = document.createElement('div');
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #667eea;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 16px;
    ">
      <span>A new version is available!</span>
      <button onclick="window.location.reload()" style="
        background: white;
        color: #667eea;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
      ">
        Update Now
      </button>
    </div>
  `;
  document.body.appendChild(updateBanner);
}

/**
 * Helper: Convert base64 to Uint8Array for VAPID keys
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Add to home screen (iOS)
 */
export function showIOSInstallPrompt(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = 'standalone' in window.navigator && (window.navigator as any).standalone;
  
  if (isIOS && !isInStandaloneMode) {
    console.log('Show iOS install prompt');
    return true;
  }
  return false;
}

/**
 * Share content using Web Share API
 */
export async function shareContent(data: ShareData): Promise<boolean> {
  if ('share' in navigator) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Error sharing:', error);
      return false;
    }
  }
  return false;
}

/**
 * Get device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Check if touch device
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Enable haptic feedback (vibration)
 */
export function hapticFeedback(pattern: number | number[] = 50): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
