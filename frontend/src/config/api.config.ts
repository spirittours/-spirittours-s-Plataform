// API Configuration
// Centralized API configuration for all environments

export const API_CONFIG = {
  // Base URLs for different environments
  baseURL: {
    development: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
    staging: process.env.REACT_APP_API_URL || 'https://staging-api.spirittours.com/api',
    production: process.env.REACT_APP_API_URL || 'https://api.spirittours.com/api',
  },

  // API Endpoints
  endpoints: {
    // Authentication
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      verify: '/auth/verify',
      forgotPassword: '/auth/forgot-password',
      resetPassword: '/auth/reset-password',
      twoFactor: '/auth/2fa',
      oauth: '/auth/oauth',
      sessions: '/auth/sessions',
    },

    // Tours
    tours: {
      base: '/tours',
      search: '/tours/search',
      categories: '/tours/categories',
      availability: '/tours/availability',
      reviews: '/tours/reviews',
      images: '/tours/images',
      itinerary: '/tours/itinerary',
      pricing: '/tours/pricing',
    },

    // Bookings
    bookings: {
      base: '/bookings',
      create: '/bookings/create',
      modify: '/bookings/modify',
      cancel: '/bookings/cancel',
      confirm: '/bookings/confirm',
      payment: '/bookings/payment',
      calendar: '/bookings/calendar',
    },

    // Customers
    customers: {
      base: '/customers',
      profile: '/customers/profile',
      history: '/customers/history',
      preferences: '/customers/preferences',
      notes: '/customers/notes',
      search: '/customers/search',
      merge: '/customers/merge',
    },

    // Payments
    payments: {
      base: '/payments',
      stripe: '/payments/stripe',
      paypal: '/payments/paypal',
      refunds: '/payments/refunds',
      methods: '/payments/methods',
      history: '/payments/history',
    },

    // Staff
    staff: {
      guides: '/staff/guides',
      resources: '/staff/resources',
      assignments: '/staff/assignments',
      availability: '/staff/availability',
      performance: '/staff/performance',
      allocations: '/staff/resource-allocations',
    },

    // Dashboard & Analytics
    analytics: {
      dashboard: '/analytics/dashboard',
      revenue: '/analytics/revenue',
      bookings: '/analytics/bookings',
      customers: '/analytics/customers',
      performance: '/analytics/performance',
      reports: '/analytics/reports',
    },

    // Settings
    settings: {
      system: '/settings/system',
      emailTemplates: '/settings/email-templates',
      paymentGateways: '/settings/payment-gateways',
      tourCategories: '/settings/tour-categories',
      tourTags: '/settings/tour-tags',
      notifications: '/settings/notifications',
      export: '/settings/export',
      import: '/settings/import',
    },

    // Marketing
    marketing: {
      campaigns: '/marketing/campaigns',
      offers: '/marketing/offers',
      discountCodes: '/marketing/discount-codes',
      newsletters: '/marketing/newsletters',
      subscribers: '/marketing/subscribers',
    },

    // Support
    support: {
      tickets: '/support/tickets',
      faqs: '/support/faqs',
      knowledgeBase: '/support/knowledge-base',
      systemHealth: '/support/system-health',
    },
  },

  // Request configuration
  request: {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  },

  // Cache configuration
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 100, // Maximum cached items
    exclude: ['/auth/', '/payments/'], // Don't cache these endpoints
  },

  // Pagination defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },

  // File upload configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFiles: 5,
  },
};

// Get current environment
export const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = process.env.REACT_APP_ENV || process.env.NODE_ENV || 'development';
  return env as 'development' | 'staging' | 'production';
};

// Get base URL for current environment
export const getBaseURL = (): string => {
  const env = getEnvironment();
  return API_CONFIG.baseURL[env];
};

// Build full API URL
export const buildURL = (endpoint: string): string => {
  return `${getBaseURL()}${endpoint}`;
};

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface APIError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

// Export default configuration
export default API_CONFIG;
