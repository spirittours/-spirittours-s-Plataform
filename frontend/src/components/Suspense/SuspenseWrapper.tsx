import React, { Suspense, ComponentType } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';

/**
 * Suspense Wrapper Component
 * 
 * Provides a consistent loading experience for lazy-loaded components.
 * Features multiple fallback variants for different contexts.
 */

// ============================================================================
// TYPES
// ============================================================================

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: 'default' | 'minimal' | 'skeleton' | 'fullscreen' | React.ReactNode;
  errorBoundary?: boolean;
}

interface LazyComponentProps {
  component: ComponentType<any>;
  fallback?: SuspenseWrapperProps['fallback'];
  [key: string]: any;
}

// ============================================================================
// FALLBACK COMPONENTS
// ============================================================================

/**
 * Default Fallback
 * Centered loading spinner with message
 */
const DefaultFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: 2,
    }}
  >
    <CircularProgress size={48} />
    <Typography variant="body1" color="text.secondary">
      Cargando módulo...
    </Typography>
  </Box>
);

/**
 * Minimal Fallback
 * Small spinner for inline components
 */
const MinimalFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
    }}
  >
    <CircularProgress size={24} />
  </Box>
);

/**
 * Skeleton Fallback
 * Animated skeleton for dashboard components
 */
const SkeletonFallback: React.FC = () => (
  <Box sx={{ padding: 3 }}>
    {[...Array(3)].map((_, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 0.6 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        style={{
          height: '80px',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      />
    ))}
  </Box>
);

/**
 * Fullscreen Fallback
 * For major page transitions
 */
const FullscreenFallback: React.FC = () => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'background.default',
      zIndex: 9999,
    }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CircularProgress size={64} thickness={4} />
      <Typography
        variant="h6"
        sx={{ mt: 3, color: 'text.secondary' }}
      >
        Cargando Spirit Tours CRM...
      </Typography>
      <Typography
        variant="body2"
        sx={{ mt: 1, color: 'text.disabled' }}
      >
        Preparando tu experiencia
      </Typography>
    </motion.div>
  </Box>
);

// ============================================================================
// FALLBACK SELECTOR
// ============================================================================

const getFallbackComponent = (
  fallback?: SuspenseWrapperProps['fallback']
): React.ReactNode => {
  if (!fallback || fallback === 'default') {
    return <DefaultFallback />;
  }

  if (fallback === 'minimal') {
    return <MinimalFallback />;
  }

  if (fallback === 'skeleton') {
    return <SkeletonFallback />;
  }

  if (fallback === 'fullscreen') {
    return <FullscreenFallback />;
  }

  // Custom fallback component
  return fallback;
};

// ============================================================================
// SUSPENSE WRAPPER
// ============================================================================

/**
 * SuspenseWrapper Component
 * 
 * Wraps children with Suspense boundary and appropriate fallback
 * 
 * @example
 * <SuspenseWrapper fallback="skeleton">
 *   <LazyComponent />
 * </SuspenseWrapper>
 */
export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({
  children,
  fallback = 'default',
}) => {
  return (
    <Suspense fallback={getFallbackComponent(fallback)}>
      {children}
    </Suspense>
  );
};

// ============================================================================
// LAZY COMPONENT WRAPPER
// ============================================================================

/**
 * withSuspense HOC
 * 
 * Higher-order component that wraps a lazy component with Suspense
 * 
 * @example
 * const LazyDashboard = withSuspense(
 *   lazy(() => import('./Dashboard')),
 *   'skeleton'
 * );
 */
export const withSuspense = <P extends object>(
  Component: ComponentType<P>,
  fallback: SuspenseWrapperProps['fallback'] = 'default'
) => {
  return (props: P) => (
    <SuspenseWrapper fallback={fallback}>
      <Component {...props} />
    </SuspenseWrapper>
  );
};

/**
 * LazyComponent
 * 
 * Convenient component for rendering lazy-loaded components
 * 
 * @example
 * <LazyComponent
 *   component={lazy(() => import('./Dashboard'))}
 *   fallback="skeleton"
 *   someProps="value"
 * />
 */
export const LazyComponent: React.FC<LazyComponentProps> = ({
  component: Component,
  fallback = 'default',
  ...props
}) => {
  return (
    <SuspenseWrapper fallback={fallback}>
      <Component {...props} />
    </SuspenseWrapper>
  );
};

// ============================================================================
// NESTED SUSPENSE WRAPPER
// ============================================================================

/**
 * NestedSuspenseWrapper
 * 
 * For components with multiple lazy-loaded sections
 * Provides granular loading states
 * 
 * @example
 * <NestedSuspenseWrapper>
 *   <Header />
 *   <LazyComponent component={LazyContent} fallback="skeleton" />
 *   <Footer />
 * </NestedSuspenseWrapper>
 */
export const NestedSuspenseWrapper: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <SuspenseWrapper fallback="minimal">
      {children}
    </SuspenseWrapper>
  );
};

// ============================================================================
// PROGRESSIVE LOADING WRAPPER
// ============================================================================

/**
 * ProgressiveLoadingWrapper
 * 
 * Shows progressive loading for multiple lazy components
 * Useful for dashboards with multiple sections
 */
export const ProgressiveLoadingWrapper: React.FC<{
  children: React.ReactNode;
  showProgress?: boolean;
}> = ({ children, showProgress = false }) => {
  const [loadedCount, setLoadedCount] = React.useState(0);
  const totalComponents = React.Children.count(children);

  React.useEffect(() => {
    // Track loading progress
    const timer = setTimeout(() => {
      if (loadedCount < totalComponents) {
        setLoadedCount(prev => prev + 1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [loadedCount, totalComponents]);

  return (
    <Box>
      {showProgress && loadedCount < totalComponents && (
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Cargando componentes... {loadedCount} / {totalComponents}
          </Typography>
          <Box
            sx={{
              height: 4,
              backgroundColor: 'grey.300',
              borderRadius: 2,
              overflow: 'hidden',
              mt: 1,
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(loadedCount / totalComponents) * 100}%` }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                backgroundColor: '#1976d2',
              }}
            />
          </Box>
        </Box>
      )}
      <SuspenseWrapper fallback="skeleton">
        {children}
      </SuspenseWrapper>
    </Box>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default SuspenseWrapper;
