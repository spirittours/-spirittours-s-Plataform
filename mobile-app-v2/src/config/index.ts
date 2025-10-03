/**
 * Application Configuration
 */

import { Platform } from 'react-native';

// API Configuration
export const API_BASE_URL = Platform.select({
  ios: 'http://localhost:8000',
  android: 'http://10.0.2.2:8000',
  default: 'https://api.spirittours.com',
});

export const API_TIMEOUT = 30000; // 30 seconds

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  FCM_TOKEN: 'fcm_token',
  LANGUAGE: 'language',
  THEME: 'theme',
  ONBOARDING_COMPLETED: 'onboarding_completed',
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'Spirit Tours',
  VERSION: '1.0.0',
  BUILD_NUMBER: '1',
  BUNDLE_ID: Platform.select({
    ios: 'com.spirittours.app',
    android: 'com.spirittours.app',
  }),
};

// Features
export const FEATURES = {
  PUSH_NOTIFICATIONS: true,
  BIOMETRIC_AUTH: true,
  OFFLINE_MODE: true,
  ANALYTICS: true,
  CRASH_REPORTING: true,
};

// Map Configuration
export const MAP_CONFIG = {
  INITIAL_REGION: {
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  ZOOM_LEVELS: {
    MIN: 1,
    MAX: 20,
    DEFAULT: 12,
  },
};

// Payment Configuration
export const PAYMENT_CONFIG = {
  STRIPE_PUBLISHABLE_KEY: Platform.select({
    ios: 'pk_test_...',
    android: 'pk_test_...',
  }),
  CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD'],
  DEFAULT_CURRENCY: 'USD',
};

// Cache Configuration
export const CACHE_CONFIG = {
  TOUR_LIST_TTL: 300, // 5 minutes
  TOUR_DETAIL_TTL: 600, // 10 minutes
  USER_PROFILE_TTL: 3600, // 1 hour
  MAX_IMAGE_CACHE_SIZE: 100 * 1024 * 1024, // 100 MB
};
