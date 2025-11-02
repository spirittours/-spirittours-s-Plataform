/**
 * PWA Utilities
 * Service Worker registration, push notifications, and offline support
 */

// Service Worker Registration
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      
      console.log('✅ Service Worker registered:', registration.scope);
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('🔄 New Service Worker available');
              
              // Notify user about update
              if (window.confirm('New version available! Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });
      
      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker updated');
      });
      
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('⚠️ Service Workers not supported');
    return null;
  }
};

// Unregister Service Worker
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    return registration.unregister();
  }
  return false;
};

// Push Notifications
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('⚠️ Notifications not supported');
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    console.log(`🔔 Notification permission: ${permission}`);
    return permission;
  }
  
  return Notification.permission;
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> => {
  try {
    const permission = await requestNotificationPermission();
    
    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      return null;
    }
    
    // Generate VAPID keys on server
    const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    
    if (!vapidPublicKey) {
      console.error('❌ VAPID public key not configured');
      return null;
    }
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    
    console.log('✅ Push subscription created:', subscription);
    
    // Send subscription to server
    await sendSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('❌ Push subscription failed:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (
  registration: ServiceWorkerRegistration
): Promise<boolean> => {
  try {
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('✅ Push subscription removed');
      
      // Notify server
      await removeSubscriptionFromServer(subscription);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Unsubscribe failed:', error);
    return false;
  }
};

// Send subscription to server
const sendSubscriptionToServer = async (subscription: PushSubscription): Promise<void> => {
  try {
    const response = await fetch('/api/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }
    
    console.log('✅ Subscription sent to server');
  } catch (error) {
    console.error('❌ Failed to send subscription:', error);
  }
};

// Remove subscription from server
const removeSubscriptionFromServer = async (subscription: PushSubscription): Promise<void> => {
  try {
    await fetch('/api/v1/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    
    console.log('✅ Subscription removed from server');
  } catch (error) {
    console.error('❌ Failed to remove subscription:', error);
  }
};

// Convert VAPID key
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
};

// Check if app is installed (PWA)
export const isAppInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Install prompt
let deferredPrompt: any = null;

export const setupInstallPrompt = (): void => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('✅ Install prompt available');
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('✅ App installed');
    deferredPrompt = null;
  });
};

export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.warn('⚠️ Install prompt not available');
    return false;
  }
  
  deferredPrompt.prompt();
  
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`Install prompt outcome: ${outcome}`);
  
  deferredPrompt = null;
  
  return outcome === 'accepted';
};

// Offline detection
export const setupOfflineDetection = (
  onOnline?: () => void,
  onOffline?: () => void
): void => {
  window.addEventListener('online', () => {
    console.log('✅ Back online');
    onOnline?.();
  });
  
  window.addEventListener('offline', () => {
    console.warn('⚠️ Offline');
    onOffline?.();
  });
};

export const isOnline = (): boolean => navigator.onLine;

// Background sync
export const registerBackgroundSync = async (tag: string): Promise<void> => {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
      console.log(`✅ Background sync registered: ${tag}`);
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  } else {
    console.warn('⚠️ Background sync not supported');
  }
};

// Cache management
export const clearAllCaches = async (): Promise<void> => {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('✅ All caches cleared');
};

export const getCacheSize = async (): Promise<number> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
};

// Network information
export const getNetworkInfo = (): {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
} => {
  const connection = (navigator as any).connection ||
                    (navigator as any).mozConnection ||
                    (navigator as any).webkitConnection;
  
  if (connection) {
    return {
      type: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
  
  return {};
};

// Battery status
export const getBatteryStatus = async (): Promise<{
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
} | null> => {
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      return {
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      };
    } catch (error) {
      console.error('❌ Battery status failed:', error);
      return null;
    }
  }
  return null;
};

// Share API
export const canShare = (): boolean => {
  return 'share' in navigator;
};

export const shareContent = async (data: ShareData): Promise<boolean> => {
  if (!canShare()) {
    console.warn('⚠️ Web Share API not supported');
    return false;
  }
  
  try {
    await navigator.share(data);
    console.log('✅ Content shared');
    return true;
  } catch (error) {
    console.error('❌ Share failed:', error);
    return false;
  }
};
