/**
 * API Configuration
 * 
 * Central configuration for all API endpoints and settings.
 * Uses environment variables for flexible deployment across environments.
 */

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

/**
 * Base API URL
 * Default: http://localhost:8000/api/v1
 * Production: Set via VITE_API_URL or REACT_APP_API_URL environment variable
 */
export const API_BASE_URL = 
  process.env.VITE_API_URL || 
  process.env.REACT_APP_API_URL || 
  'http://localhost:8000/api/v1';

/**
 * WebSocket URL
 * Default: ws://localhost:8000/ws
 * Production: Set via VITE_WS_URL or REACT_APP_WS_URL environment variable
 */
export const WS_BASE_URL = 
  process.env.VITE_WS_URL || 
  process.env.REACT_APP_WS_URL || 
  'ws://localhost:8000/ws';

/**
 * API Timeout (milliseconds)
 * Default: 30000 (30 seconds)
 */
export const API_TIMEOUT = parseInt(
  process.env.VITE_API_TIMEOUT || 
  process.env.REACT_APP_API_TIMEOUT || 
  '30000', 
  10
);

/**
 * Enable request logging
 * Default: true in development, false in production
 */
export const ENABLE_API_LOGGING = 
  process.env.VITE_DEBUG === 'true' ||
  process.env.REACT_APP_ENABLE_API_LOGGING === 'true' || 
  process.env.NODE_ENV === 'development';

/**
 * Enable request retry
 * Default: true
 */
export const ENABLE_RETRY = 
  process.env.VITE_ENABLE_RETRY !== 'false' &&
  process.env.REACT_APP_ENABLE_RETRY !== 'false';

/**
 * Max retry attempts
 * Default: 3
 */
export const MAX_RETRY_ATTEMPTS = parseInt(
  process.env.VITE_MAX_RETRY_ATTEMPTS || 
  process.env.REACT_APP_MAX_RETRY_ATTEMPTS || 
  '3',
  10
);

/**
 * Retry delay (milliseconds)
 * Default: 1000 (1 second)
 */
export const RETRY_DELAY = parseInt(
  process.env.VITE_RETRY_DELAY || 
  process.env.REACT_APP_RETRY_DELAY || 
  '1000',
  10
);

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Authentication Endpoints
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  VERIFY_EMAIL: '/auth/verify-email',
  RESET_PASSWORD: '/auth/reset-password',
  CHANGE_PASSWORD: '/auth/change-password',
  PROFILE: '/auth/profile',
} as const;

/**
 * User Management Endpoints
 */
export const USER_ENDPOINTS = {
  LIST: '/users',
  GET: (id: string) => `/users/${id}`,
  CREATE: '/users',
  UPDATE: (id: string) => `/users/${id}`,
  DELETE: (id: string) => `/users/${id}`,
  PERMISSIONS: (id: string) => `/users/${id}/permissions`,
  ROLES: (id: string) => `/users/${id}/roles`,
} as const;

/**
 * Tour Management Endpoints
 */
export const TOUR_ENDPOINTS = {
  LIST: '/tours',
  GET: (id: string) => `/tours/${id}`,
  CREATE: '/tours',
  UPDATE: (id: string) => `/tours/${id}`,
  DELETE: (id: string) => `/tours/${id}`,
  AVAILABILITY: (id: string) => `/tours/${id}/availability`,
  PRICING: (id: string) => `/tours/${id}/pricing`,
  IMAGES: (id: string) => `/tours/${id}/images`,
  REVIEWS: (id: string) => `/tours/${id}/reviews`,
} as const;

/**
 * Booking Management Endpoints
 */
export const BOOKING_ENDPOINTS = {
  LIST: '/bookings',
  GET: (id: string) => `/bookings/${id}`,
  CREATE: '/bookings',
  UPDATE: (id: string) => `/bookings/${id}`,
  DELETE: (id: string) => `/bookings/${id}`,
  CANCEL: (id: string) => `/bookings/${id}/cancel`,
  CONFIRM: (id: string) => `/bookings/${id}/confirm`,
  PAYMENT: (id: string) => `/bookings/${id}/payment`,
  INVOICE: (id: string) => `/bookings/${id}/invoice`,
} as const;

/**
 * Customer Management Endpoints
 */
export const CUSTOMER_ENDPOINTS = {
  LIST: '/customers',
  GET: (id: string) => `/customers/${id}`,
  CREATE: '/customers',
  UPDATE: (id: string) => `/customers/${id}`,
  DELETE: (id: string) => `/customers/${id}`,
  BOOKINGS: (id: string) => `/customers/${id}/bookings`,
  PREFERENCES: (id: string) => `/customers/${id}/preferences`,
  HISTORY: (id: string) => `/customers/${id}/history`,
} as const;

/**
 * Analytics Endpoints
 */
export const ANALYTICS_ENDPOINTS = {
  DASHBOARD: '/analytics/dashboard',
  REVENUE: '/analytics/revenue',
  BOOKINGS: '/analytics/bookings',
  CUSTOMERS: '/analytics/customers',
  TOURS: '/analytics/tours',
  TRENDS: '/analytics/trends',
  REPORTS: '/analytics/reports',
  EXPORT: '/analytics/export',
} as const;

/**
 * File Management Endpoints
 */
export const FILE_ENDPOINTS = {
  LIST: '/files',
  UPLOAD: '/files/upload',
  DOWNLOAD: (id: string) => `/files/${id}/download`,
  DELETE: (id: string) => `/files/${id}`,
  FOLDERS: '/files/folders',
  SEARCH: '/files/search',
} as const;

/**
 * Notification Endpoints
 */
export const NOTIFICATION_ENDPOINTS = {
  LIST: '/notifications',
  GET: (id: string) => `/notifications/${id}`,
  MARK_READ: (id: string) => `/notifications/${id}/read`,
  MARK_UNREAD: (id: string) => `/notifications/${id}/unread`,
  DELETE: (id: string) => `/notifications/${id}`,
  MARK_ALL_READ: '/notifications/mark-all-read',
  PREFERENCES: '/notifications/preferences',
  WS_CONNECT: '/notifications/ws',
} as const;

/**
 * Payment Endpoints
 */
export const PAYMENT_ENDPOINTS = {
  CREATE: '/payments',
  GET: (id: string) => `/payments/${id}`,
  PROCESS: '/payments/process',
  REFUND: (id: string) => `/payments/${id}/refund`,
  METHODS: '/payments/methods',
  HISTORY: '/payments/history',
} as const;

/**
 * AI Agents Endpoints
 */
export const AI_AGENT_ENDPOINTS = {
  CHAT: '/ai/chat',
  ANALYZE: '/ai/analyze',
  RECOMMEND: '/ai/recommend',
  OPTIMIZE: '/ai/optimize',
  AGENTS: '/ai/agents',
  AGENT_STATUS: (id: string) => `/ai/agents/${id}/status`,
} as const;

// ============================================================================
// REQUEST CONFIGURATION
// ============================================================================

/**
 * Default request headers
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;

/**
 * Multipart form data headers
 */
export const MULTIPART_HEADERS = {
  'Content-Type': 'multipart/form-data',
} as const;

/**
 * Request methods that should retry on failure
 */
export const RETRYABLE_METHODS = ['GET', 'PUT', 'DELETE'] as const;

/**
 * HTTP status codes that should trigger retry
 */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504] as const;

/**
 * HTTP status codes that indicate authentication errors
 */
export const AUTH_ERROR_CODES = [401, 403] as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build full API URL
 */
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

/**
 * Build WebSocket URL
 */
export const buildWsUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  return `${WS_BASE_URL}/${cleanEndpoint}`;
};

/**
 * Check if status code is retryable
 */
export const isRetryableStatusCode = (statusCode: number): boolean => {
  return RETRYABLE_STATUS_CODES.includes(statusCode as any);
};

/**
 * Check if status code is authentication error
 */
export const isAuthError = (statusCode: number): boolean => {
  return AUTH_ERROR_CODES.includes(statusCode as any);
};

/**
 * Check if request method is retryable
 */
export const isRetryableMethod = (method: string): boolean => {
  return RETRYABLE_METHODS.includes(method.toUpperCase() as any);
};

/**
 * Get authorization header
 */
export const getAuthHeader = (token?: string): Record<string, string> => {
  const authToken = token || localStorage.getItem('auth_token');
  
  if (!authToken) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${authToken}`,
  };
};

/**
 * Validate API configuration
 */
export const validateApiConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!API_BASE_URL) {
    errors.push('API_BASE_URL is not configured');
  }
  
  if (!WS_BASE_URL) {
    errors.push('WS_BASE_URL is not configured');
  }
  
  if (API_TIMEOUT < 1000) {
    errors.push('API_TIMEOUT is too low (minimum 1000ms)');
  }
  
  if (MAX_RETRY_ATTEMPTS < 0 || MAX_RETRY_ATTEMPTS > 10) {
    errors.push('MAX_RETRY_ATTEMPTS must be between 0 and 10');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  API_BASE_URL,
  WS_BASE_URL,
  API_TIMEOUT,
  ENABLE_API_LOGGING,
  ENABLE_RETRY,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY,
  AUTH_ENDPOINTS,
  USER_ENDPOINTS,
  TOUR_ENDPOINTS,
  BOOKING_ENDPOINTS,
  CUSTOMER_ENDPOINTS,
  ANALYTICS_ENDPOINTS,
  FILE_ENDPOINTS,
  NOTIFICATION_ENDPOINTS,
  PAYMENT_ENDPOINTS,
  AI_AGENT_ENDPOINTS,
  DEFAULT_HEADERS,
  MULTIPART_HEADERS,
  buildApiUrl,
  buildWsUrl,
  isRetryableStatusCode,
  isAuthError,
  isRetryableMethod,
  getAuthHeader,
  validateApiConfig,
};
