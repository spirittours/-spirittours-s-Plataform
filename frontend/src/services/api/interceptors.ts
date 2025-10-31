/**
 * Axios Interceptors
 * 
 * Request and response interceptors for handling authentication,
 * errors, retries, and logging.
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  API_TIMEOUT,
  ENABLE_API_LOGGING,
  ENABLE_RETRY,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY,
  getAuthHeader,
  isRetryableStatusCode,
  isRetryableMethod,
  isAuthError,
} from '../../config/api.config';
import { Logger } from '../../utils/logger';

// ============================================================================
// LOGGER INSTANCE
// ============================================================================

const logger = new Logger();

// ============================================================================
// TYPES
// ============================================================================

interface RetryConfig extends AxiosRequestConfig {
  __retryCount?: number;
  __isRetry?: boolean;
}

interface ErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

// ============================================================================
// REQUEST INTERCEPTORS
// ============================================================================

/**
 * Request Interceptor: Add Authentication
 * Adds JWT token to all requests
 */
export const authRequestInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  const authHeader = getAuthHeader();
  
  if (authHeader.Authorization) {
    config.headers = {
      ...config.headers,
      ...authHeader,
    };
  }
  
  return config;
};

/**
 * Request Interceptor: Logging
 * Logs all outgoing requests in development
 */
export const loggingRequestInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  if (ENABLE_API_LOGGING) {
    logger.debug('API Request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      params: config.params,
      data: config.data,
    });
  }
  
  return config;
};

/**
 * Request Interceptor: Add Request ID
 * Adds unique request ID for tracking
 */
export const requestIdInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  config.headers = {
    ...config.headers,
    'X-Request-ID': requestId,
  };
  
  // Store request ID in config for use in response
  (config as any).__requestId = requestId;
  
  return config;
};

/**
 * Request Interceptor: Timeout
 * Sets default timeout for all requests
 */
export const timeoutInterceptor = (config: AxiosRequestConfig): AxiosRequestConfig => {
  if (!config.timeout) {
    config.timeout = API_TIMEOUT;
  }
  
  return config;
};

// ============================================================================
// RESPONSE INTERCEPTORS
// ============================================================================

/**
 * Response Interceptor: Success Logging
 * Logs successful responses
 */
export const loggingResponseInterceptor = (response: AxiosResponse): AxiosResponse => {
  if (ENABLE_API_LOGGING) {
    const requestId = (response.config as any).__requestId;
    
    logger.debug('API Response', {
      requestId,
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });
  }
  
  return response;
};

/**
 * Response Interceptor: Data Extraction
 * Automatically extract data from response
 */
export const dataExtractionInterceptor = (response: AxiosResponse): any => {
  // If response has a 'data' property, return it
  // Otherwise return the whole response
  return response.data ?? response;
};

// ============================================================================
// ERROR INTERCEPTORS
// ============================================================================

/**
 * Error Interceptor: Retry Logic
 * Automatically retries failed requests
 */
export const retryErrorInterceptor = async (
  error: AxiosError,
  axiosInstance: AxiosInstance
): Promise<any> => {
  const config = error.config as RetryConfig;
  
  // Check if retry is enabled and applicable
  if (
    !ENABLE_RETRY ||
    !config ||
    config.__isRetry ||
    !isRetryableMethod(config.method || 'GET')
  ) {
    return Promise.reject(error);
  }
  
  // Initialize retry count
  config.__retryCount = config.__retryCount || 0;
  
  // Check if max retries reached
  if (config.__retryCount >= MAX_RETRY_ATTEMPTS) {
    logger.error('Max retry attempts reached', error, {
      url: config.url,
      retryCount: config.__retryCount,
    });
    return Promise.reject(error);
  }
  
  // Check if status code is retryable
  if (error.response && !isRetryableStatusCode(error.response.status)) {
    return Promise.reject(error);
  }
  
  // Increment retry count
  config.__retryCount += 1;
  config.__isRetry = true;
  
  // Log retry attempt
  logger.warn('Retrying request', {
    url: config.url,
    attempt: config.__retryCount,
    maxAttempts: MAX_RETRY_ATTEMPTS,
  });
  
  // Calculate exponential backoff delay
  const backoffDelay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1);
  
  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, backoffDelay));
  
  // Retry the request
  return axiosInstance.request(config);
};

/**
 * Error Interceptor: Authentication Error Handler
 * Handles 401/403 errors and redirects to login
 */
export const authErrorInterceptor = (error: AxiosError): Promise<any> => {
  if (error.response && isAuthError(error.response.status)) {
    logger.warn('Authentication error', {
      status: error.response.status,
      url: error.config?.url,
    });
    
    // Clear stored token
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    
    // Redirect to login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
  
  return Promise.reject(error);
};

/**
 * Error Interceptor: Network Error Handler
 * Handles network errors gracefully
 */
export const networkErrorInterceptor = (error: AxiosError): Promise<any> => {
  if (!error.response) {
    // Network error (no response received)
    logger.error('Network error', error, {
      url: error.config?.url,
      message: 'No response received from server',
    });
    
    // Create user-friendly error
    const networkError: ErrorResponse = {
      message: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
      code: 'NETWORK_ERROR',
    };
    
    return Promise.reject(networkError);
  }
  
  return Promise.reject(error);
};

/**
 * Error Interceptor: Error Formatting
 * Formats error responses for consistent handling
 */
export const errorFormattingInterceptor = (error: AxiosError): Promise<any> => {
  const requestId = (error.config as any)?.__requestId;
  
  if (error.response) {
    // Server responded with error status
    const errorResponse: ErrorResponse = {
      message: error.response.data?.message || error.message || 'Ocurrió un error',
      code: error.response.data?.code || `HTTP_${error.response.status}`,
      details: {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        requestId,
      },
    };
    
    logger.error('API Error Response', error, {
      requestId,
      url: error.config?.url,
      status: error.response.status,
      message: errorResponse.message,
    });
    
    return Promise.reject(errorResponse);
  }
  
  return Promise.reject(error);
};

/**
 * Error Interceptor: Rate Limit Handler
 * Handles 429 (Too Many Requests) errors
 */
export const rateLimitErrorInterceptor = async (
  error: AxiosError,
  axiosInstance: AxiosInstance
): Promise<any> => {
  if (error.response?.status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000; // Default 60s
    
    logger.warn('Rate limit exceeded', {
      url: error.config?.url,
      retryAfter: delay,
    });
    
    // Wait for retry-after period
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry the request
    return axiosInstance.request(error.config!);
  }
  
  return Promise.reject(error);
};

// ============================================================================
// INTERCEPTOR SETUP UTILITY
// ============================================================================

/**
 * Setup all interceptors on an Axios instance
 */
export const setupInterceptors = (axiosInstance: AxiosInstance): void => {
  // Request Interceptors (order matters - executed in reverse)
  axiosInstance.interceptors.request.use(timeoutInterceptor);
  axiosInstance.interceptors.request.use(requestIdInterceptor);
  axiosInstance.interceptors.request.use(authRequestInterceptor);
  axiosInstance.interceptors.request.use(loggingRequestInterceptor);
  
  // Response Interceptors (order matters)
  axiosInstance.interceptors.response.use(
    loggingResponseInterceptor,
    (error) => Promise.reject(error)
  );
  
  axiosInstance.interceptors.response.use(
    dataExtractionInterceptor,
    (error) => Promise.reject(error)
  );
  
  // Error Interceptors (order matters)
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => rateLimitErrorInterceptor(error, axiosInstance)
  );
  
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => retryErrorInterceptor(error, axiosInstance)
  );
  
  axiosInstance.interceptors.response.use(
    (response) => response,
    authErrorInterceptor
  );
  
  axiosInstance.interceptors.response.use(
    (response) => response,
    networkErrorInterceptor
  );
  
  axiosInstance.interceptors.response.use(
    (response) => response,
    errorFormattingInterceptor
  );
  
  logger.info('Axios interceptors configured', {
    retry: ENABLE_RETRY,
    logging: ENABLE_API_LOGGING,
    timeout: API_TIMEOUT,
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  setupInterceptors,
  authRequestInterceptor,
  loggingRequestInterceptor,
  requestIdInterceptor,
  timeoutInterceptor,
  loggingResponseInterceptor,
  dataExtractionInterceptor,
  retryErrorInterceptor,
  authErrorInterceptor,
  networkErrorInterceptor,
  errorFormattingInterceptor,
  rateLimitErrorInterceptor,
};
