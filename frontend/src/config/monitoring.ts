// Performance Monitoring Configuration
// Supports Sentry, Google Analytics, and custom metrics

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Sentry Configuration
export const initSentry = () => {
  if (!isDevelopment) {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        new BrowserTracing({
          tracingOrigins: [
            'localhost',
            /^\//,
            process.env.REACT_APP_API_URL || 'http://localhost:5001',
          ],
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            window.history,
            window.location
          ),
        }),
      ],
      
      // Performance Monitoring
      tracesSampleRate: isProduction ? 0.2 : 1.0, // 20% in prod, 100% in dev
      
      // Session Replay
      replaysSessionSampleRate: isProduction ? 0.1 : 0.5,
      replaysOnErrorSampleRate: 1.0,
      
      // Error filtering
      beforeSend(event, hint) {
        // Filter out known errors
        const error = hint.originalException as Error;
        
        // Ignore network errors
        if (error?.message?.includes('Network Error')) {
          return null;
        }
        
        // Ignore cancelled requests
        if (error?.message?.includes('cancelled')) {
          return null;
        }
        
        // Add user context
        if (event.user) {
          event.user.ip_address = '{{auto}}';
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'ChunkLoadError',
        /Loading chunk \d+ failed/,
      ],
    });
    
    console.log('✅ Sentry initialized');
  }
};

// Google Analytics Configuration
export const initGoogleAnalytics = () => {
  const GA_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;
  
  if (GA_MEASUREMENT_ID && !isDevelopment) {
    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    
    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: true,
      anonymize_ip: true,
    });
    
    console.log('✅ Google Analytics initialized');
  }
};

// Custom event tracking
export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value,
    });
  }
  
  // Sentry breadcrumb
  Sentry.addBreadcrumb({
    category,
    message: `${action} - ${label || ''}`,
    level: 'info',
    data: { value },
  });
  
  // Console log in development
  if (isDevelopment) {
    console.log('[Event]', { category, action, label, value });
  }
};

// Page view tracking
export const trackPageView = (path: string, title?: string) => {
  // Google Analytics
  if (window.gtag) {
    window.gtag('config', process.env.REACT_APP_GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: title,
    });
  }
  
  // Sentry transaction
  Sentry.setContext('page', {
    path,
    title,
  });
  
  if (isDevelopment) {
    console.log('[Page View]', { path, title });
  }
};

// Error tracking
export const trackError = (error: Error, context?: Record<string, any>) => {
  // Sentry
  Sentry.captureException(error, {
    contexts: { custom: context },
  });
  
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: error.message,
      fatal: false,
    });
  }
  
  console.error('[Error]', error, context);
};

// Performance metrics
export interface PerformanceMetrics {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
}

export const trackPerformance = (metrics: PerformanceMetrics) => {
  // Sentry transaction
  const transaction = Sentry.startTransaction({
    name: metrics.name,
    op: 'measure',
  });
  
  transaction.setMeasurement('duration', metrics.duration, 'millisecond');
  transaction.finish();
  
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'timing_complete', {
      name: metrics.name,
      value: metrics.duration,
      event_category: 'Performance',
    });
  }
  
  if (isDevelopment) {
    console.log('[Performance]', metrics);
  }
};

// User identification
export const identifyUser = (userId: string, email?: string, name?: string) => {
  // Sentry
  Sentry.setUser({
    id: userId,
    email,
    username: name,
  });
  
  // Google Analytics
  if (window.gtag) {
    window.gtag('set', 'user_properties', {
      user_id: userId,
    });
  }
  
  if (isDevelopment) {
    console.log('[User Identified]', { userId, email, name });
  }
};

// Clear user identity (logout)
export const clearUserIdentity = () => {
  Sentry.setUser(null);
  
  if (isDevelopment) {
    console.log('[User Identity Cleared]');
  }
};

// Web Vitals tracking
export const trackWebVitals = () => {
  if ('web-vital' in window || 'PerformanceObserver' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => trackPerformanceMetric('CLS', metric.value));
      getFID((metric) => trackPerformanceMetric('FID', metric.value));
      getFCP((metric) => trackPerformanceMetric('FCP', metric.value));
      getLCP((metric) => trackPerformanceMetric('LCP', metric.value));
      getTTFB((metric) => trackPerformanceMetric('TTFB', metric.value));
    });
  }
};

const trackPerformanceMetric = (name: string, value: number) => {
  // Sentry
  Sentry.setMeasurement(name, value, 'millisecond');
  
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', name, {
      value: Math.round(value),
      event_category: 'Web Vitals',
      non_interaction: true,
    });
  }
  
  if (isDevelopment) {
    console.log(`[Web Vital] ${name}:`, value);
  }
};

// Custom performance marks
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  
  mark(name: string) {
    this.marks.set(name, performance.now());
    performance.mark(name);
  }
  
  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();
    
    if (start !== undefined && end !== undefined) {
      const duration = end - start;
      
      trackPerformance({
        name,
        duration,
        startTime: start,
        endTime: end,
      });
      
      return duration;
    }
    
    return 0;
  }
  
  clear() {
    this.marks.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize all monitoring
export const initMonitoring = () => {
  initSentry();
  initGoogleAnalytics();
  trackWebVitals();
  
  console.log('✅ Monitoring initialized');
};

// Type declarations for window
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}
