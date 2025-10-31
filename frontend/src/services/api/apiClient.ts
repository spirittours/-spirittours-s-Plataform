/**
 * API Client
 * 
 * Centralized HTTP client for all API requests.
 * Includes authentication, error handling, retries, and logging.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, DEFAULT_HEADERS } from '../../config/api.config';
import { setupInterceptors } from './interceptors';
import { Logger } from '../../utils/logger';
import { CacheManager } from '../../utils/cache';

// ============================================================================
// LOGGER AND CACHE
// ============================================================================

const logger = new Logger();
const cache = new CacheManager();

// ============================================================================
// TYPES
// ============================================================================

interface RequestOptions extends AxiosRequestConfig {
  cache?: boolean;
  cacheTTL?: number;
  skipAuth?: boolean;
  skipRetry?: boolean;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, any>;
}

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

/**
 * Create Axios instance with base configuration
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: DEFAULT_HEADERS,
    withCredentials: true, // Include cookies in requests
  });
  
  // Setup all interceptors
  setupInterceptors(instance);
  
  return instance;
};

// Global axios instance
const axiosInstance = createAxiosInstance();

// ============================================================================
// API CLIENT CLASS
// ============================================================================

class ApiClient {
  private instance: AxiosInstance;
  
  constructor(instance: AxiosInstance) {
    this.instance = instance;
  }
  
  // ==========================================================================
  // CORE REQUEST METHODS
  // ==========================================================================
  
  /**
   * GET Request
   */
  async get<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { cache: enableCache = false, cacheTTL, ...config } = options;
    
    // Check cache first
    if (enableCache) {
      const cacheKey = `get:${url}:${JSON.stringify(config.params)}`;
      const cached = cache.get<T>(cacheKey);
      
      if (cached) {
        logger.debug('Cache hit', { url, cacheKey });
        return cached;
      }
      
      // Fetch and cache
      const response = await this.instance.get<T>(url, config);
      cache.set(cacheKey, response, cacheTTL);
      
      return response;
    }
    
    return this.instance.get<T>(url, config);
  }
  
  /**
   * POST Request
   */
  async post<T = any>(
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.instance.post<T>(url, data, options);
  }
  
  /**
   * PUT Request
   */
  async put<T = any>(
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.instance.put<T>(url, data, options);
  }
  
  /**
   * PATCH Request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.instance.patch<T>(url, data, options);
  }
  
  /**
   * DELETE Request
   */
  async delete<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.instance.delete<T>(url, options);
  }
  
  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================
  
  /**
   * GET with pagination
   */
  async getPaginated<T = any>(
    url: string,
    params: PaginationParams = {},
    options: RequestOptions = {}
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      pageSize = 10,
      sortBy,
      sortOrder = 'asc',
    } = params;
    
    return this.get(url, {
      ...options,
      params: {
        ...options.params,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      },
    });
  }
  
  /**
   * Search with filters
   */
  async search<T = any>(
    url: string,
    searchParams: SearchParams = {},
    options: RequestOptions = {}
  ): Promise<{
    results: T[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      query,
      filters,
      page = 1,
      pageSize = 10,
      sortBy,
      sortOrder = 'asc',
    } = searchParams;
    
    return this.get(url, {
      ...options,
      params: {
        ...options.params,
        q: query,
        ...filters,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      },
    });
  }
  
  /**
   * Upload file
   */
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    options: RequestOptions = {}
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post(url, formData, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }
  
  /**
   * Upload multiple files
   */
  async uploadFiles<T = any>(
    url: string,
    files: File[],
    onProgress?: (progress: number) => void,
    options: RequestOptions = {}
  ): Promise<T> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    
    return this.post(url, formData, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }
  
  /**
   * Download file
   */
  async downloadFile(
    url: string,
    filename?: string,
    onProgress?: (progress: number) => void,
    options: RequestOptions = {}
  ): Promise<void> {
    const response = await this.get(url, {
      ...options,
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    
    // Create download link
    const blob = new Blob([response]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
  
  /**
   * Batch requests
   */
  async batch<T = any>(
    requests: Array<() => Promise<any>>
  ): Promise<T[]> {
    return Promise.all(requests.map(req => req()));
  }
  
  /**
   * Batch requests with limit (prevent overwhelming server)
   */
  async batchWithLimit<T = any>(
    requests: Array<() => Promise<any>>,
    limit: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += limit) {
      const batch = requests.slice(i, i + limit);
      const batchResults = await Promise.all(batch.map(req => req()));
      results.push(...batchResults);
    }
    
    return results;
  }
  
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  /**
   * Get the underlying Axios instance
   */
  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
  
  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
    logger.info('Auth token set');
  }
  
  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    logger.info('Auth token cleared');
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }
  
  /**
   * Clear request cache
   */
  clearCache(): void {
    cache.clear();
    logger.info('API cache cleared');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const apiClient = new ApiClient(axiosInstance);

// ============================================================================
// EXPORTS
// ============================================================================

export default apiClient;
export { ApiClient, axiosInstance };
export type { RequestOptions, PaginationParams, SearchParams };
