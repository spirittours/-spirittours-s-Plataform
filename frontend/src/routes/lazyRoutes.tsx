import { lazy, ComponentType } from 'react';
import { RouteObject } from 'react-router-dom';

/**
 * Lazy Route Configuration
 * 
 * This module provides lazy-loaded route components for code splitting.
 * Each route is loaded only when needed, reducing initial bundle size.
 * 
 * Features:
 * - Automatic code splitting per route
 * - Preload functionality for strategic loading
 * - Type-safe route definitions
 * - Organized by feature modules
 */

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

export const LoginPage = lazy(() => import('../components/Auth/LoginPage'));

// ============================================================================
// CRM ROUTES
// ============================================================================

export const CRMDashboard = lazy(() => import('../components/CRM/CRMDashboard'));
export const UserManagement = lazy(() => import('../components/CRM/UserManagement'));

// ============================================================================
// AI AGENTS ROUTES
// ============================================================================

export const AIAgentsRouter = lazy(() => import('../components/AIAgents/AIAgentsRouter'));

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

export const AnalyticsRouter = lazy(() => import('../components/Analytics/AnalyticsRouter'));

// ============================================================================
// PORTALS ROUTES
// ============================================================================

export const PortalsRouter = lazy(() => import('../components/Portals/PortalsRouter'));

// ============================================================================
// PAYMENTS ROUTES
// ============================================================================

export const PaymentsRouter = lazy(() => import('../components/Payments/PaymentsRouter'));

// ============================================================================
// FILE MANAGER ROUTES
// ============================================================================

export const FileManagerRouter = lazy(() => import('../components/FileManager/FileManagerRouter'));

// ============================================================================
// NOTIFICATIONS ROUTES
// ============================================================================

export const NotificationsRouter = lazy(() => import('../components/Notifications/NotificationsRouter'));

// ============================================================================
// LEGACY ROUTES
// ============================================================================

export const Layout = lazy(() => import('../components/Layout/Layout'));
export const Dashboard = lazy(() => import('../components/Dashboard/Dashboard'));
export const ComingSoon = lazy(() => import('../components/Placeholder/ComingSoon'));

// ============================================================================
// RBAC COMPONENTS
// ============================================================================

export const PermissionGate = lazy(() => import('../components/RBAC/PermissionGate'));

// ============================================================================
// PRELOAD UTILITIES
// ============================================================================

/**
 * Preload a lazy component
 * Useful for prefetching components before user navigates
 * 
 * @example
 * // Preload on hover
 * <Link onMouseEnter={() => preloadComponent(CRMDashboard)} to="/crm">
 *   Dashboard
 * </Link>
 */
export const preloadComponent = (component: ReturnType<typeof lazy>) => {
  // @ts-ignore - Access the internal _payload for preloading
  if (component._payload && component._payload._result === null) {
    // @ts-ignore
    component._payload._result = component._payload._fn();
  }
};

/**
 * Preload multiple components
 * Useful for prefetching a set of related components
 * 
 * @example
 * // Preload all analytics components after login
 * preloadComponents([AnalyticsRouter, Dashboard]);
 */
export const preloadComponents = (components: ReturnType<typeof lazy>[]) => {
  components.forEach(component => preloadComponent(component));
};

// ============================================================================
// STRATEGIC PRELOADING
// ============================================================================

/**
 * Preload critical components after initial render
 * These are the most commonly accessed routes
 */
export const preloadCriticalRoutes = () => {
  // Preload CRM dashboard (most accessed)
  preloadComponent(CRMDashboard);
  
  // Preload notifications (accessed frequently)
  preloadComponent(NotificationsRouter);
  
  // Delay non-critical preloads
  setTimeout(() => {
    preloadComponent(AnalyticsRouter);
    preloadComponent(FileManagerRouter);
  }, 3000);
};

/**
 * Preload routes based on user role
 * Admin users need different components than regular users
 */
export const preloadRoleBasedRoutes = (isAdmin: boolean) => {
  if (isAdmin) {
    preloadComponents([
      UserManagement,
      AnalyticsRouter,
      AIAgentsRouter
    ]);
  } else {
    preloadComponents([
      PortalsRouter,
      PaymentsRouter
    ]);
  }
};

// ============================================================================
// ROUTE PREFETCH ON HOVER
// ============================================================================

/**
 * Hook for prefetching routes on link hover
 * 
 * @example
 * const { onMouseEnter } = usePrefetchRoute(CRMDashboard);
 * <Link onMouseEnter={onMouseEnter} to="/crm">Dashboard</Link>
 */
export const usePrefetchRoute = (component: ReturnType<typeof lazy>) => {
  return {
    onMouseEnter: () => preloadComponent(component),
    onFocus: () => preloadComponent(component),
  };
};

// ============================================================================
// LAZY ROUTE WRAPPERS WITH ERROR BOUNDARIES
// ============================================================================

/**
 * Create a lazy route with automatic retry on failure
 * Useful for handling network failures during chunk loading
 */
export const lazyWithRetry = (
  importFunc: () => Promise<{ default: ComponentType<any> }>,
  retries = 3,
  interval = 1000
): ReturnType<typeof lazy> => {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attemptImport = (retriesLeft: number) => {
        importFunc()
          .then(resolve)
          .catch((error) => {
            if (retriesLeft === 0) {
              reject(error);
              return;
            }
            
            setTimeout(() => {
              console.log(`Retrying import... (${retriesLeft} attempts left)`);
              attemptImport(retriesLeft - 1);
            }, interval);
          });
      };
      
      attemptImport(retries);
    });
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Auth
  LoginPage,
  
  // CRM
  CRMDashboard,
  UserManagement,
  
  // Feature Routers
  AIAgentsRouter,
  AnalyticsRouter,
  PortalsRouter,
  PaymentsRouter,
  FileManagerRouter,
  NotificationsRouter,
  
  // Legacy
  Layout,
  Dashboard,
  ComingSoon,
  
  // RBAC
  PermissionGate,
  
  // Utilities
  preloadComponent,
  preloadComponents,
  preloadCriticalRoutes,
  preloadRoleBasedRoutes,
  usePrefetchRoute,
  lazyWithRetry,
};
