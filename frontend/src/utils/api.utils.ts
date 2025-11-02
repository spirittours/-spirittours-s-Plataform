// API Utility Functions
// Helper functions for API requests, error handling, and data transformation

import { AxiosError, AxiosResponse } from 'axios';
import { APIError, APIResponse } from '../config/api.config';
import toast from 'react-hot-toast';

// ============================================================================
// Error Handling
// ============================================================================

export const handleAPIError = (error: any): APIError => {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;
    return {
      status,
      message: data.message || 'An error occurred',
      errors: data.errors,
      code: data.code,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      status: 0,
      message: 'No response from server. Please check your connection.',
      code: 'NETWORK_ERROR',
    };
  } else {
    // Request setup error
    return {
      status: 0,
      message: error.message || 'An unexpected error occurred',
      code: 'REQUEST_ERROR',
    };
  }
};

export const showErrorToast = (error: APIError): void => {
  if (error.errors) {
    // Show validation errors
    Object.values(error.errors).flat().forEach((msg) => {
      toast.error(msg);
    });
  } else {
    toast.error(error.message);
  }
};

// ============================================================================
// Response Transformation
// ============================================================================

export const transformResponse = <T>(response: AxiosResponse): APIResponse<T> => {
  return {
    success: true,
    data: response.data.data || response.data,
    message: response.data.message,
    meta: response.data.meta,
  };
};

// ============================================================================
// Query String Building
// ============================================================================

export const buildQueryString = (params: Record<string, any>): string => {
  const filtered = Object.entries(params).filter(
    ([_, value]) => value !== undefined && value !== null && value !== ''
  );

  if (filtered.length === 0) return '';

  const searchParams = new URLSearchParams();
  filtered.forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(`${key}[]`, v));
    } else if (typeof value === 'object' && value instanceof Date) {
      searchParams.append(key, value.toISOString());
    } else {
      searchParams.append(key, String(value));
    }
  });

  return `?${searchParams.toString()}`;
};

// ============================================================================
// Pagination Helpers
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getPaginationParams = (params: PaginationParams): Record<string, any> => {
  return {
    page: params.page || 1,
    limit: params.limit || 20,
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortOrder && { sortOrder: params.sortOrder }),
  };
};

// ============================================================================
// File Upload Helpers
// ============================================================================

export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (value instanceof FileList) {
      Array.from(value).forEach((file) => {
        formData.append(`${key}[]`, file);
      });
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item instanceof File) {
          formData.append(`${key}[]`, item);
        } else {
          formData.append(`${key}[]`, JSON.stringify(item));
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  return formData;
};

export const validateFile = (file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
}): { valid: boolean; error?: string } => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes } = options;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
};

// ============================================================================
// Data Transformation
// ============================================================================

export const transformDates = <T extends Record<string, any>>(
  data: T,
  dateFields: string[]
): T => {
  const transformed = { ...data };

  dateFields.forEach((field) => {
    if (transformed[field]) {
      transformed[field] = new Date(transformed[field]);
    }
  });

  return transformed;
};

export const serializeDates = <T extends Record<string, any>>(
  data: T,
  dateFields: string[]
): T => {
  const serialized = { ...data };

  dateFields.forEach((field) => {
    if (serialized[field] instanceof Date) {
      serialized[field] = serialized[field].toISOString();
    }
  });

  return serialized;
};

// ============================================================================
// Request Retry Logic
// ============================================================================

export const shouldRetry = (error: AxiosError, attemptNumber: number): boolean => {
  const maxRetries = 3;

  if (attemptNumber >= maxRetries) return false;

  // Retry on network errors or 5xx server errors
  if (!error.response) return true;
  if (error.response.status >= 500) return true;

  // Don't retry on client errors
  return false;
};

export const getRetryDelay = (attemptNumber: number): number => {
  // Exponential backoff: 1s, 2s, 4s
  return Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
};

// ============================================================================
// Cache Helpers
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl: number = 300000): void {
    // Remove oldest if at max size
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Singleton cache instance
export const apiCache = new APICache();

// ============================================================================
// Request Deduplication
// ============================================================================

const pendingRequests = new Map<string, Promise<any>>();

export const deduplicateRequest = <T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Create new request
  const request = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, request);
  return request;
};

// ============================================================================
// Batch Requests
// ============================================================================

export const batchRequests = async <T>(
  requests: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> => {
  const results: T[] = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((req) => req()));
    results.push(...batchResults);
  }

  return results;
};

// ============================================================================
// Export all utilities
// ============================================================================

export default {
  handleAPIError,
  showErrorToast,
  transformResponse,
  buildQueryString,
  getPaginationParams,
  createFormData,
  validateFile,
  transformDates,
  serializeDates,
  shouldRetry,
  getRetryDelay,
  apiCache,
  deduplicateRequest,
  batchRequests,
};
