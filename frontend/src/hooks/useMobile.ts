// Spirit Tours - Mobile Detection Hook
// Custom React hook for responsive and mobile-specific functionality
// Version: 1.0.0

import { useState, useEffect } from 'react';

interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

/**
 * Custom hook to detect mobile devices and screen sizes
 */
export function useMobile(): MobileState {
  const [mobileState, setMobileState] = useState<MobileState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        isPortrait: true,
        isLandscape: false,
        width: 1024,
        height: 768,
        deviceType: 'desktop',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;
    const isPortrait = height > width;
    const isLandscape = width > height;

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      isPortrait,
      isLandscape,
      width,
      height,
      deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const isTouchDevice =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;
      const isPortrait = height > width;
      const isLandscape = width > height;

      setMobileState({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        isPortrait,
        isLandscape,
        width,
        height,
        deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return mobileState;
}

/**
 * Hook to detect network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for PWA install prompt
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) {
      return false;
    }

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setInstallPrompt(null);
    return outcome === 'accepted';
  };

  return {
    installPrompt,
    isInstalled,
    promptInstall,
    canInstall: !!installPrompt && !isInstalled,
  };
}

/**
 * Hook for touch gestures
 */
interface TouchGesture {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useTouchGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
}: TouchGesture) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      if (Math.abs(distanceX) > threshold) {
        if (distanceX > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (distanceX < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    } else {
      if (Math.abs(distanceY) > threshold) {
        if (distanceY > 0 && onSwipeUp) {
          onSwipeUp();
        } else if (distanceY < 0 && onSwipeDown) {
          onSwipeDown();
        }
      }
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

/**
 * Hook for haptic feedback
 */
export function useHaptic() {
  const vibrate = (pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const light = () => vibrate(10);
  const medium = () => vibrate(50);
  const heavy = () => vibrate(100);
  const success = () => vibrate([50, 100, 50]);
  const warning = () => vibrate([100, 50, 100, 50, 100]);
  const error = () => vibrate([100, 50, 100]);

  return {
    vibrate,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
  };
}

/**
 * Hook for safe area insets (for notched devices)
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeArea;
}
