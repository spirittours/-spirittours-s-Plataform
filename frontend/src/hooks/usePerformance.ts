import { useEffect, useRef, useCallback } from 'react';
import { trackPerformance, performanceMonitor } from '../config/monitoring';

/**
 * Hook to measure component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderCount = useRef(0);
  const mountTime = useRef<number>(0);
  
  useEffect(() => {
    // Track mount time
    if (renderCount.current === 0) {
      mountTime.current = performance.now();
    }
    
    renderCount.current += 1;
    
    // Track initial render
    if (renderCount.current === 1) {
      const duration = performance.now() - mountTime.current;
      trackPerformance({
        name: `${componentName} - Initial Render`,
        duration,
        startTime: mountTime.current,
        endTime: performance.now(),
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (renderCount.current === 1) {
        const totalTime = performance.now() - mountTime.current;
        trackPerformance({
          name: `${componentName} - Total Mount Time`,
          duration: totalTime,
          startTime: mountTime.current,
          endTime: performance.now(),
        });
      }
    };
  }, [componentName]);
  
  return {
    renderCount: renderCount.current,
    mountTime: mountTime.current,
  };
};

/**
 * Hook to measure async operation performance
 */
export const useAsyncPerformance = () => {
  const measureAsync = useCallback(async <T,>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    performanceMonitor.mark(startMark);
    
    try {
      const result = await operation();
      performanceMonitor.mark(endMark);
      performanceMonitor.measure(name, startMark, endMark);
      return result;
    } catch (error) {
      performanceMonitor.mark(endMark);
      performanceMonitor.measure(`${name} (failed)`, startMark, endMark);
      throw error;
    }
  }, []);
  
  return { measureAsync };
};

/**
 * Hook to track API call performance
 */
export const useAPIPerformance = () => {
  const trackAPICall = useCallback((
    endpoint: string,
    method: string,
    duration: number,
    status: number
  ) => {
    trackPerformance({
      name: `API: ${method} ${endpoint}`,
      duration,
      startTime: performance.now() - duration,
      endTime: performance.now(),
    });
    
    // Additional tracking for slow requests
    if (duration > 3000) {
      console.warn(`[Slow API Call] ${method} ${endpoint}: ${duration}ms`);
    }
  }, []);
  
  return { trackAPICall };
};

/**
 * Hook to measure data fetching performance
 */
export const useFetchPerformance = (resourceName: string) => {
  const startTime = useRef<number>(0);
  
  const startFetch = useCallback(() => {
    startTime.current = performance.now();
    performanceMonitor.mark(`${resourceName}-fetch-start`);
  }, [resourceName]);
  
  const endFetch = useCallback((success: boolean = true) => {
    const duration = performance.now() - startTime.current;
    const status = success ? 'success' : 'failed';
    
    performanceMonitor.mark(`${resourceName}-fetch-end`);
    performanceMonitor.measure(
      `${resourceName} fetch (${status})`,
      `${resourceName}-fetch-start`,
      `${resourceName}-fetch-end`
    );
    
    return duration;
  }, [resourceName]);
  
  return { startFetch, endFetch };
};

/**
 * Hook to track user interactions
 */
export const useInteractionPerformance = () => {
  const measureInteraction = useCallback((
    interactionName: string,
    action: () => void | Promise<void>
  ) => {
    const start = performance.now();
    const startMark = `interaction-${interactionName}-start`;
    
    performanceMonitor.mark(startMark);
    
    const result = action();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        trackPerformance({
          name: `Interaction: ${interactionName}`,
          duration,
          startTime: start,
          endTime: performance.now(),
        });
      });
    } else {
      const duration = performance.now() - start;
      trackPerformance({
        name: `Interaction: ${interactionName}`,
        duration,
        startTime: start,
        endTime: performance.now(),
      });
    }
  }, []);
  
  return { measureInteraction };
};

/**
 * Hook to monitor component updates
 */
export const useUpdatePerformance = (componentName: string, dependencies: any[]) => {
  const updateCount = useRef(0);
  const lastUpdateTime = useRef<number>(0);
  
  useEffect(() => {
    updateCount.current += 1;
    
    if (updateCount.current > 1) {
      const now = performance.now();
      const timeSinceLastUpdate = now - lastUpdateTime.current;
      
      trackPerformance({
        name: `${componentName} - Update`,
        duration: timeSinceLastUpdate,
        startTime: lastUpdateTime.current,
        endTime: now,
      });
      
      // Warn about frequent updates
      if (timeSinceLastUpdate < 100) {
        console.warn(
          `[Frequent Updates] ${componentName} updated within ${timeSinceLastUpdate}ms`
        );
      }
      
      lastUpdateTime.current = now;
    } else {
      lastUpdateTime.current = performance.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  
  return {
    updateCount: updateCount.current,
    lastUpdateTime: lastUpdateTime.current,
  };
};

/**
 * Hook to track route changes
 */
export const useRoutePerformance = (routeName: string) => {
  const routeStartTime = useRef<number>(0);
  
  useEffect(() => {
    routeStartTime.current = performance.now();
    performanceMonitor.mark(`route-${routeName}-start`);
    
    return () => {
      const duration = performance.now() - routeStartTime.current;
      performanceMonitor.mark(`route-${routeName}-end`);
      performanceMonitor.measure(
        `Route: ${routeName}`,
        `route-${routeName}-start`,
        `route-${routeName}-end`
      );
      
      trackPerformance({
        name: `Route: ${routeName}`,
        duration,
        startTime: routeStartTime.current,
        endTime: performance.now(),
      });
    };
  }, [routeName]);
};

/**
 * Hook to track lazy component loading
 */
export const useLazyLoadPerformance = (componentName: string) => {
  const loadStartTime = useRef<number>(0);
  
  const trackLazyLoad = useCallback(() => {
    loadStartTime.current = performance.now();
  }, []);
  
  const trackLazyLoadComplete = useCallback(() => {
    const duration = performance.now() - loadStartTime.current;
    trackPerformance({
      name: `Lazy Load: ${componentName}`,
      duration,
      startTime: loadStartTime.current,
      endTime: performance.now(),
    });
  }, [componentName]);
  
  return { trackLazyLoad, trackLazyLoadComplete };
};
