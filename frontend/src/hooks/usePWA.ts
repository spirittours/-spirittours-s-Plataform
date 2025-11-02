import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker,
  subscribeToPushNotifications,
  requestNotificationPermission,
  isAppInstalled,
  showInstallPrompt,
  setupInstallPrompt,
  setupOfflineDetection,
  isOnline as checkIsOnline,
} from '../utils/pwa';

interface PWAStatus {
  isInstalled: boolean;
  isOnline: boolean;
  canInstall: boolean;
  notificationPermission: NotificationPermission;
  serviceWorkerReady: boolean;
  pushSubscription: PushSubscription | null;
}

export const usePWA = () => {
  const [status, setStatus] = useState<PWAStatus>({
    isInstalled: isAppInstalled(),
    isOnline: checkIsOnline(),
    canInstall: false,
    notificationPermission: 'default',
    serviceWorkerReady: false,
    pushSubscription: null,
  });
  
  // Initialize PWA features
  useEffect(() => {
    const initializePWA = async () => {
      // Register service worker
      const registration = await registerServiceWorker();
      
      if (registration) {
        setStatus((prev) => ({ ...prev, serviceWorkerReady: true }));
        
        // Check push subscription
        const subscription = await registration.pushManager.getSubscription();
        setStatus((prev) => ({ ...prev, pushSubscription: subscription }));
      }
      
      // Setup install prompt
      setupInstallPrompt();
      
      // Check notification permission
      if ('Notification' in window) {
        setStatus((prev) => ({
          ...prev,
          notificationPermission: Notification.permission,
        }));
      }
      
      // Setup offline detection
      setupOfflineDetection(
        () => setStatus((prev) => ({ ...prev, isOnline: true })),
        () => setStatus((prev) => ({ ...prev, isOnline: false }))
      );
    };
    
    initializePWA();
    
    // Listen for install prompt
    const handleBeforeInstall = () => {
      setStatus((prev) => ({ ...prev, canInstall: true }));
    };
    
    const handleAppInstalled = () => {
      setStatus((prev) => ({ ...prev, isInstalled: true, canInstall: false }));
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  // Install app
  const install = useCallback(async () => {
    const accepted = await showInstallPrompt();
    
    if (accepted) {
      setStatus((prev) => ({ ...prev, canInstall: false, isInstalled: true }));
    }
    
    return accepted;
  }, []);
  
  // Enable push notifications
  const enablePushNotifications = useCallback(async () => {
    const permission = await requestNotificationPermission();
    setStatus((prev) => ({ ...prev, notificationPermission: permission }));
    
    if (permission === 'granted' && status.serviceWorkerReady) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await subscribeToPushNotifications(registration);
      setStatus((prev) => ({ ...prev, pushSubscription: subscription }));
      return subscription !== null;
    }
    
    return false;
  }, [status.serviceWorkerReady]);
  
  // Request notification permission only
  const requestPermission = useCallback(async () => {
    const permission = await requestNotificationPermission();
    setStatus((prev) => ({ ...prev, notificationPermission: permission }));
    return permission;
  }, []);
  
  return {
    ...status,
    install,
    enablePushNotifications,
    requestPermission,
  };
};

export default usePWA;
