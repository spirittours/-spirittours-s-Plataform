/**
 * PHASE 3: Mobile Analytics App - Global State Store
 * Zustand-based state management for the mobile analytics application
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  User,
  DashboardConfig,
  MetricData,
  Alert,
  Theme,
  AppState,
  UserPreferences,
  SecurityConfig,
  OfflineData
} from '../types';

// Default theme
const defaultTheme: Theme = {
  colors: {
    primary: '#1a1a2e',
    secondary: '#16213e',
    background: '#f8f9fa',
    surface: '#ffffff',
    accent: '#0f4c75',
    error: '#dc3545',
    warning: '#ffc107',
    success: '#28a745',
    info: '#17a2b8',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    disabled: '#e9ecef',
    placeholder: '#adb5bd',
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

// Dark theme
const darkTheme: Theme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: '#4f46e5',
    secondary: '#7c3aed',
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    border: '#374151',
    disabled: '#4b5563',
    placeholder: '#6b7280',
  },
};

interface StoreState extends AppState {
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setDashboards: (dashboards: DashboardConfig[]) => void;
  setCurrentDashboard: (dashboardId: string | null) => void;
  updateMetrics: (metrics: { [key: string]: MetricData }) => void;
  addMetric: (metric: MetricData) => void;
  updateAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  dismissAlert: (alertId: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // User preferences
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  
  // Security
  securityConfig: SecurityConfig;
  updateSecurityConfig: (config: Partial<SecurityConfig>) => void;
  
  // Offline support
  offlineData: OfflineData | null;
  setOfflineData: (data: OfflineData) => void;
  
  // App lifecycle
  reset: () => void;
  logout: () => void;
}

const defaultSecurityConfig: SecurityConfig = {
  biometricEnabled: false,
  pinEnabled: false,
  sessionTimeout: 30, // 30 minutes
  autoLock: true,
  dataEncryption: true,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      theme: defaultTheme,
      dashboards: [],
      currentDashboard: null,
      metrics: {},
      alerts: [],
      isOnline: true,
      isLoading: false,
      error: null,
      securityConfig: defaultSecurityConfig,
      offlineData: null,

      // User actions
      setUser: (user) => set({ user }),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      // Theme actions
      setTheme: (theme) => set({ theme }),
      
      toggleTheme: () => {
        const currentTheme = get().theme;
        const isDark = currentTheme.colors.background === darkTheme.colors.background;
        set({ theme: isDark ? defaultTheme : darkTheme });
      },

      // Dashboard actions
      setDashboards: (dashboards) => set({ dashboards }),
      
      setCurrentDashboard: (dashboardId) => set({ currentDashboard: dashboardId }),

      // Metrics actions
      updateMetrics: (metrics) => 
        set((state) => ({ 
          metrics: { ...state.metrics, ...metrics } 
        })),
      
      addMetric: (metric) =>
        set((state) => ({
          metrics: { ...state.metrics, [metric.id]: metric }
        })),

      // Alerts actions
      updateAlerts: (alerts) => set({ alerts }),
      
      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts]
        })),
      
      dismissAlert: (alertId) =>
        set((state) => ({
          alerts: state.alerts.filter(alert => alert.id !== alertId)
        })),

      // App state actions
      setOnlineStatus: (isOnline) => set({ isOnline }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      // User preferences
      updateUserPreferences: (preferences) =>
        set((state) => ({
          user: state.user ? {
            ...state.user,
            preferences: { ...state.user.preferences, ...preferences }
          } : null
        })),

      // Security
      updateSecurityConfig: (config) =>
        set((state) => ({
          securityConfig: { ...state.securityConfig, ...config }
        })),

      // Offline support
      setOfflineData: (data) => set({ offlineData: data }),

      // App lifecycle
      reset: () => set({
        user: null,
        isAuthenticated: false,
        dashboards: [],
        currentDashboard: null,
        metrics: {},
        alerts: [],
        isLoading: false,
        error: null,
        offlineData: null,
      }),

      logout: () => {
        const { reset } = get();
        reset();
      },
    }),
    {
      name: 'genspark-analytics-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        dashboards: state.dashboards,
        currentDashboard: state.currentDashboard,
        securityConfig: state.securityConfig,
        offlineData: state.offlineData,
      }),
    }
  )
);

// Selectors for common use cases
export const useUser = () => useStore((state) => state.user);
export const useAuth = () => useStore((state) => ({
  isAuthenticated: state.isAuthenticated,
  user: state.user,
  setUser: state.setUser,
  setAuthenticated: state.setAuthenticated,
  logout: state.logout,
}));

export const useTheme = () => useStore((state) => ({
  theme: state.theme,
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
}));

export const useDashboards = () => useStore((state) => ({
  dashboards: state.dashboards,
  currentDashboard: state.currentDashboard,
  setDashboards: state.setDashboards,
  setCurrentDashboard: state.setCurrentDashboard,
}));

export const useMetrics = () => useStore((state) => ({
  metrics: state.metrics,
  updateMetrics: state.updateMetrics,
  addMetric: state.addMetric,
}));

export const useAlerts = () => useStore((state) => ({
  alerts: state.alerts,
  updateAlerts: state.updateAlerts,
  addAlert: state.addAlert,
  dismissAlert: state.dismissAlert,
}));

export const useAppState = () => useStore((state) => ({
  isOnline: state.isOnline,
  isLoading: state.isLoading,
  error: state.error,
  setOnlineStatus: state.setOnlineStatus,
  setLoading: state.setLoading,
  setError: state.setError,
}));

export const useSecurity = () => useStore((state) => ({
  securityConfig: state.securityConfig,
  updateSecurityConfig: state.updateSecurityConfig,
}));

export const useOffline = () => useStore((state) => ({
  offlineData: state.offlineData,
  setOfflineData: state.setOfflineData,
}));

// Action creators for complex operations
export const storeActions = {
  // Initialize app with user data
  initializeApp: async (userData: User) => {
    const { setUser, setAuthenticated, updateUserPreferences } = useStore.getState();
    
    setUser(userData);
    setAuthenticated(true);
    
    // Apply user preferences
    if (userData.preferences) {
      updateUserPreferences(userData.preferences);
      
      // Apply theme preference
      if (userData.preferences.theme === 'dark') {
        useStore.getState().setTheme(darkTheme);
      } else if (userData.preferences.theme === 'light') {
        useStore.getState().setTheme(defaultTheme);
      }
    }
  },

  // Handle metric updates with real-time data
  updateRealtimeMetrics: (newMetrics: { [key: string]: MetricData }) => {
    const { updateMetrics } = useStore.getState();
    updateMetrics(newMetrics);
    
    // Check for alert conditions
    Object.values(newMetrics).forEach(metric => {
      if (metric.threshold) {
        const { addAlert } = useStore.getState();
        
        if (metric.value >= metric.threshold.critical) {
          addAlert({
            id: `metric-${metric.id}-${Date.now()}`,
            title: `Critical: ${metric.name}`,
            message: `${metric.name} has reached critical threshold: ${metric.value}`,
            severity: 'critical',
            timestamp: new Date().toISOString(),
            source: 'metrics',
            metric: metric.id,
            value: metric.value,
            threshold: metric.threshold.critical,
            resolved: false,
          });
        } else if (metric.value >= metric.threshold.warning) {
          addAlert({
            id: `metric-${metric.id}-${Date.now()}`,
            title: `Warning: ${metric.name}`,
            message: `${metric.name} has reached warning threshold: ${metric.value}`,
            severity: 'warning',
            timestamp: new Date().toISOString(),
            source: 'metrics',
            metric: metric.id,
            value: metric.value,
            threshold: metric.threshold.warning,
            resolved: false,
          });
        }
      }
    });
  },

  // Prepare offline data for storage
  prepareOfflineData: (dashboards: DashboardConfig[], metrics: { [key: string]: MetricData }) => {
    const offlineData: OfflineData = {
      dashboards,
      metrics: Object.values(metrics),
      lastSync: new Date().toISOString(),
      version: '1.0.0',
    };
    
    const { setOfflineData } = useStore.getState();
    setOfflineData(offlineData);
  },

  // Handle app errors
  handleError: (error: Error | string, context?: string) => {
    const { setError, addAlert } = useStore.getState();
    
    const errorMessage = typeof error === 'string' ? error : error.message;
    setError(errorMessage);
    
    // Create alert for critical errors
    if (context === 'critical') {
      addAlert({
        id: `error-${Date.now()}`,
        title: 'System Error',
        message: errorMessage,
        severity: 'error',
        timestamp: new Date().toISOString(),
        source: 'system',
        resolved: false,
      });
    }
    
    console.error(`[Store Error] ${context ? `[${context}]` : ''} ${errorMessage}`);
  },

  // Clear error state
  clearError: () => {
    const { setError } = useStore.getState();
    setError(null);
  },

  // Get current theme colors
  getThemeColors: () => {
    const { theme } = useStore.getState();
    return theme.colors;
  },

  // Check if user has permission
  hasPermission: (resource: string, action: string): boolean => {
    const { user } = useStore.getState();
    
    if (!user || !user.permissions) {
      return false;
    }
    
    const permission = user.permissions.find(p => p.resource === resource);
    return permission ? permission.actions.includes(action as any) : false;
  },
};

export default useStore;