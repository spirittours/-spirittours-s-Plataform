/**
 * Analytics API Service
 * Comprehensive API client for analytics endpoints with advanced features.
 * 
 * Features:
 * - RESTful API integration
 * - Automatic error handling
 * - Request/response interceptors
 * - Caching with TTL
 * - Retry mechanisms
 * - Performance monitoring
 * - Export capabilities
 */

import axios from 'axios';

// Create analytics API instance
const analyticsAPI = axios.create({
  baseURL: '/api/analytics',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Cache configuration
const CACHE_CONFIG = {
  ttl: 60000, // 1 minute TTL
  maxSize: 100,
  enabled: true
};

// In-memory cache
const cache = new Map();
const cacheTimestamps = new Map();

// Cache utilities
const getCacheKey = (url, params) => {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${url}_${paramStr}`;
};

const isCacheValid = (key) => {
  const timestamp = cacheTimestamps.get(key);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_CONFIG.ttl;
};

const setCache = (key, data) => {
  if (!CACHE_CONFIG.enabled) return;
  
  // Implement LRU eviction if cache is full
  if (cache.size >= CACHE_CONFIG.maxSize) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
    cacheTimestamps.delete(firstKey);
  }
  
  cache.set(key, data);
  cacheTimestamps.set(key, Date.now());
};

const getCache = (key) => {
  if (!CACHE_CONFIG.enabled || !isCacheValid(key)) {
    cache.delete(key);
    cacheTimestamps.delete(key);
    return null;
  }
  return cache.get(key);
};

// Request interceptor for authentication
analyticsAPI.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for performance monitoring
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and caching
analyticsAPI.interceptors.response.use(
  (response) => {
    // Calculate request duration
    if (response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      response.duration = duration;
      
      // Log slow requests
      if (duration > 5000) {
        console.warn(`Slow analytics API request: ${response.config.url} took ${duration}ms`);
      }
    }
    
    // Cache GET requests
    if (response.config.method === 'get') {
      const cacheKey = getCacheKey(response.config.url, response.config.params);
      setCache(cacheKey, response.data);
    }
    
    return response;
  },
  (error) => {
    // Enhanced error handling
    const errorInfo = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    };
    
    console.error('Analytics API Error:', errorInfo);
    
    // Transform common errors to user-friendly messages
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please log in again.'));
    } else if (error.response?.status === 403) {
      return Promise.reject(new Error('Access denied. Insufficient permissions.'));
    } else if (error.response?.status === 429) {
      return Promise.reject(new Error('Too many requests. Please try again later.'));
    } else if (error.response?.status >= 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }
    
    return Promise.reject(error);
  }
);

// Retry mechanism for failed requests
const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1 || error.response?.status < 500) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

// Analytics API methods
export const analyticsService = {
  
  /**
   * Get real-time Key Performance Indicators
   */
  async getKPIs(timeFrame = 'day', useCache = true) {
    const cacheKey = getCacheKey('/kpis', { timeFrame });
    
    if (useCache) {
      const cached = getCache(cacheKey);
      if (cached) return { data: cached };
    }
    
    return retryRequest(() => 
      analyticsAPI.get('/kpis', { params: { time_frame: timeFrame } })
    );
  },

  /**
   * Execute custom analytics query
   */
  async queryAnalytics(queryParams) {
    return retryRequest(() => 
      analyticsAPI.post('/query', queryParams)
    );
  },

  /**
   * Get comprehensive booking analytics
   */
  async getBookingAnalytics(timeFrame = 'day', businessModel = null, useCache = true) {
    const params = { time_frame: timeFrame };
    if (businessModel) params.business_model = businessModel;
    
    const cacheKey = getCacheKey('/bookings', params);
    
    if (useCache) {
      const cached = getCache(cacheKey);
      if (cached) return { data: cached };
    }
    
    return retryRequest(() => 
      analyticsAPI.get('/bookings', { params })
    );
  },

  /**
   * Get comprehensive payment analytics
   */
  async getPaymentAnalytics(timeFrame = 'day', useCache = true) {
    const params = { time_frame: timeFrame };
    const cacheKey = getCacheKey('/payments', params);
    
    if (useCache) {
      const cached = getCache(cacheKey);
      if (cached) return { data: cached };
    }
    
    return retryRequest(() => 
      analyticsAPI.get('/payments', { params })
    );
  },

  /**
   * Get AI agent usage and performance analytics
   */
  async getAIUsageAnalytics(timeFrame = 'day', useCache = true) {
    const params = { time_frame: timeFrame };
    const cacheKey = getCacheKey('/ai-usage', params);
    
    if (useCache) {
      const cached = getCache(cacheKey);
      if (cached) return { data: cached };
    }
    
    return retryRequest(() => 
      analyticsAPI.get('/ai-usage', { params })
    );
  },

  /**
   * Get user engagement and behavioral analytics
   */
  async getUserEngagementAnalytics(timeFrame = 'day', useCache = true) {
    const params = { time_frame: timeFrame };
    const cacheKey = getCacheKey('/user-engagement', params);
    
    if (useCache) {
      const cached = getCache(cacheKey);
      if (cached) return { data: cached };
    }
    
    return retryRequest(() => 
      analyticsAPI.get('/user-engagement', { params })
    );
  },

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(reportConfig) {
    return retryRequest(() => 
      analyticsAPI.post('/reports/generate', reportConfig)
    );
  },

  /**
   * Get generated analytics report
   */
  async getReport(reportId, format = 'json') {
    return retryRequest(() => 
      analyticsAPI.get(`/reports/${reportId}`, { 
        params: { format },
        responseType: format === 'json' ? 'json' : 'blob'
      })
    );
  },

  /**
   * Get dashboard configuration
   */
  async getDashboardConfig(dashboardName) {
    const cacheKey = getCacheKey('/dashboard/config', { dashboardName });
    const cached = getCache(cacheKey);
    if (cached) return { data: cached };
    
    return retryRequest(() => 
      analyticsAPI.get('/dashboard/config', { 
        params: { dashboard_name: dashboardName } 
      })
    );
  },

  /**
   * Save dashboard configuration
   */
  async saveDashboardConfig(config) {
    const response = await retryRequest(() => 
      analyticsAPI.post('/dashboard/config', config)
    );
    
    // Invalidate dashboard config cache
    cache.forEach((value, key) => {
      if (key.includes('/dashboard/config')) {
        cache.delete(key);
        cacheTimestamps.delete(key);
      }
    });
    
    return response;
  },

  /**
   * Export analytics data
   */
  async exportAnalytics(metricType, format = 'csv', timeFrame = 'day') {
    return retryRequest(() => 
      analyticsAPI.get(`/export/${metricType}`, {
        params: { format, time_frame: timeFrame },
        responseType: format === 'json' ? 'json' : 'blob'
      })
    );
  },

  /**
   * Get health status
   */
  async getHealth() {
    return analyticsAPI.get('/health');
  },

  /**
   * Clear cache (utility method)
   */
  clearCache() {
    cache.clear();
    cacheTimestamps.clear();
  },

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const validEntries = Array.from(cacheTimestamps.entries())
      .filter(([key]) => isCacheValid(key));
    
    return {
      size: cache.size,
      validEntries: validEntries.length,
      hitRate: cache.size > 0 ? (validEntries.length / cache.size) * 100 : 0,
      maxSize: CACHE_CONFIG.maxSize,
      ttl: CACHE_CONFIG.ttl,
      enabled: CACHE_CONFIG.enabled
    };
  },

  /**
   * Configure cache settings
   */
  configureCac
  /**
   * Configure cache settings
   */
  configureCache(config) {
    Object.assign(CACHE_CONFIG, config);
    
    // Clear cache if disabled
    if (!CACHE_CONFIG.enabled) {
      this.clearCache();
    }
  },

  /**
   * Batch request multiple analytics endpoints
   */
  async batchRequest(requests) {
    const promises = requests.map(request => {
      const { endpoint, params, method = 'get' } = request;
      
      if (method === 'get') {
        return this[endpoint](params?.time_frame, params?.business_model, params?.use_cache);
      } else {
        return analyticsAPI[method](endpoint, params);
      }
    });

    try {
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => ({
        request: requests[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value.data : null,
        error: result.status === 'rejected' ? result.reason : null
      }));
    } catch (error) {
      console.error('Batch request failed:', error);
      throw error;
    }
  },

  /**
   * Get performance metrics for API calls
   */
  getPerformanceMetrics() {
    // This would typically be stored in a more sophisticated way
    const metrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: this.getCacheStats().hitRate
    };

    return metrics;
  },

  /**
   * Subscribe to real-time analytics updates via WebSocket
   */
  subscribeToUpdates(subscriptions, options = {}) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/analytics/ws/real-time`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      // Send subscription configuration
      const config = {
        type: 'configure',
        subscriptions: Array.isArray(subscriptions) ? subscriptions : [subscriptions],
        update_frequency: options.updateFrequency || 'normal',
        compression: options.compression !== false,
        filters: options.filters || {}
      };
      
      ws.send(JSON.stringify(config));
      
      if (options.onOpen) options.onOpen();
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle compressed messages
        if (data.compressed && options.compression !== false) {
          // Decompress if needed (implementation depends on compression format)
          console.log('Received compressed message:', data.compressed_size, 'bytes');
        }
        
        if (options.onMessage) options.onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        if (options.onError) options.onError(error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (options.onError) options.onError(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      if (options.onClose) options.onClose(event);
    };
    
    return ws;
  }
};

// Export default instance
export default analyticsService;