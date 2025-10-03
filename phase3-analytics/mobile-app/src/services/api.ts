/**
 * PHASE 3: Mobile Analytics App - API Service
 * Comprehensive API service for mobile analytics dashboard with offline support
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { 
  APIResponse, 
  User, 
  DashboardConfig, 
  MetricData, 
  BusinessMetrics,
  SystemMetrics,
  UserAnalytics,
  SalesAnalytics,
  Alert,
  TimeRange 
} from '../types';

class APIService {
  private client: AxiosInstance;
  private baseURL: string;
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string = 'https://api.genspark.ai/v1') {
    this.baseURL = baseURL;
    this.client = this.createAxiosInstance();
    this.setupInterceptors();
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'GenSpark-Mobile-Analytics/1.0.0',
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add authentication token
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        // Add timestamp
        config.headers['X-Timestamp'] = new Date().toISOString();

        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[API] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      async (error) => {
        console.error('[API] Response error:', error);

        // Handle token expiration
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            // Retry the original request
            return this.client.request(error.config);
          } catch (refreshError) {
            // Refresh failed, logout user
            await this.logout();
            throw refreshError;
          }
        }

        // Handle network errors
        if (!error.response) {
          throw new Error('Network error. Please check your connection.');
        }

        return Promise.reject(error);
      }
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    try {
      this.token = await SecureStore.getItemAsync('access_token');
      return this.token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  private async setToken(token: string): Promise<void> {
    this.token = token;
    try {
      await SecureStore.setItemAsync('access_token', token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  private async setRefreshToken(token: string): Promise<void> {
    this.refreshToken = token;
    try {
      await SecureStore.setItemAsync('refresh_token', token);
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    if (this.refreshToken) {
      return this.refreshToken;
    }

    try {
      this.refreshToken = await SecureStore.getItemAsync('refresh_token');
      return this.refreshToken;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Authentication Methods
   */
  
  async login(email: string, password: string): Promise<APIResponse<{ user: User; tokens: any }>> {
    try {
      const response = await this.client.post('/auth/login', {
        email,
        password,
      });

      const { access_token, refresh_token, user } = response.data.data;
      
      await this.setToken(access_token);
      await this.setRefreshToken(refresh_token);

      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint if token exists
      const token = await this.getToken();
      if (token) {
        await this.client.post('/auth/logout');
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear stored tokens regardless of API call success
      this.token = null;
      this.refreshToken = null;
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    }
  }

  async refreshAccessToken(): Promise<string> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token: newRefreshToken } = response.data.data;
      
      await this.setToken(access_token);
      if (newRefreshToken) {
        await this.setRefreshToken(newRefreshToken);
      }

      return access_token;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getCurrentUser(): Promise<APIResponse<User>> {
    try {
      const response = await this.client.get('/auth/me');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateUser(userData: Partial<User>): Promise<APIResponse<User>> {
    try {
      const response = await this.client.put('/auth/me', userData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Dashboard Methods
   */

  async getDashboards(): Promise<APIResponse<DashboardConfig[]>> {
    try {
      const response = await this.client.get('/dashboards');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getDashboard(id: string): Promise<APIResponse<DashboardConfig>> {
    try {
      const response = await this.client.get(`/dashboards/${id}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async createDashboard(dashboard: Omit<DashboardConfig, 'id'>): Promise<APIResponse<DashboardConfig>> {
    try {
      const response = await this.client.post('/dashboards', dashboard);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateDashboard(id: string, dashboard: Partial<DashboardConfig>): Promise<APIResponse<DashboardConfig>> {
    try {
      const response = await this.client.put(`/dashboards/${id}`, dashboard);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deleteDashboard(id: string): Promise<APIResponse<void>> {
    try {
      const response = await this.client.delete(`/dashboards/${id}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Metrics Methods
   */

  async getBusinessMetrics(timeRange?: TimeRange): Promise<APIResponse<BusinessMetrics>> {
    try {
      const params = timeRange ? { 
        start: timeRange.start, 
        end: timeRange.end,
        preset: timeRange.preset 
      } : {};
      
      const response = await this.client.get('/analytics/business-metrics', { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getSystemMetrics(timeRange?: TimeRange): Promise<APIResponse<SystemMetrics>> {
    try {
      const params = timeRange ? { 
        start: timeRange.start, 
        end: timeRange.end,
        preset: timeRange.preset 
      } : {};
      
      const response = await this.client.get('/analytics/system-metrics', { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getUserAnalytics(timeRange?: TimeRange): Promise<APIResponse<UserAnalytics>> {
    try {
      const params = timeRange ? { 
        start: timeRange.start, 
        end: timeRange.end,
        preset: timeRange.preset 
      } : {};
      
      const response = await this.client.get('/analytics/user-analytics', { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getSalesAnalytics(timeRange?: TimeRange): Promise<APIResponse<SalesAnalytics>> {
    try {
      const params = timeRange ? { 
        start: timeRange.start, 
        end: timeRange.end,
        preset: timeRange.preset 
      } : {};
      
      const response = await this.client.get('/analytics/sales-analytics', { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getMetric(metricName: string, timeRange?: TimeRange): Promise<APIResponse<MetricData>> {
    try {
      const params = timeRange ? { 
        start: timeRange.start, 
        end: timeRange.end,
        preset: timeRange.preset 
      } : {};
      
      const response = await this.client.get(`/analytics/metrics/${metricName}`, { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Widget Data Methods
   */

  async getWidgetData(
    widgetId: string, 
    config: any, 
    timeRange?: TimeRange
  ): Promise<APIResponse<any>> {
    try {
      const params = {
        ...config,
        ...(timeRange && { 
          start: timeRange.start, 
          end: timeRange.end,
          preset: timeRange.preset 
        })
      };
      
      const response = await this.client.get(`/widgets/${widgetId}/data`, { params });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Alerts Methods
   */

  async getAlerts(limit: number = 50): Promise<APIResponse<Alert[]>> {
    try {
      const response = await this.client.get('/alerts', { params: { limit } });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async markAlertRead(alertId: string): Promise<APIResponse<void>> {
    try {
      const response = await this.client.patch(`/alerts/${alertId}/read`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async dismissAlert(alertId: string): Promise<APIResponse<void>> {
    try {
      const response = await this.client.delete(`/alerts/${alertId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Export Methods
   */

  async exportDashboard(
    dashboardId: string, 
    format: 'pdf' | 'excel' | 'csv',
    options?: any
  ): Promise<APIResponse<{ downloadUrl: string }>> {
    try {
      const response = await this.client.post(`/dashboards/${dashboardId}/export`, {
        format,
        ...options
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Real-time Data Methods
   */

  async subscribeToMetric(metricName: string): Promise<EventSource | null> {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const eventSource = new EventSource(
        `${this.baseURL}/stream/metrics/${metricName}?token=${encodeURIComponent(token)}`
      );

      return eventSource;
    } catch (error) {
      console.error('Failed to subscribe to metric:', error);
      return null;
    }
  }

  /**
   * Settings Methods
   */

  async getAppSettings(): Promise<APIResponse<any>> {
    try {
      const response = await this.client.get('/settings/app');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateAppSettings(settings: any): Promise<APIResponse<any>> {
    try {
      const response = await this.client.put('/settings/app', settings);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Health Check
   */

  async healthCheck(): Promise<APIResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Custom Request Method
   */

  async request<T = any>(config: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response = await this.client.request(config);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Error Handling
   */

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const message = data?.message || `HTTP ${status} Error`;
      
      console.error('[API Error]', {
        status,
        message,
        url: error.config?.url,
        method: error.config?.method
      });

      return new Error(message);
    } else if (error.request) {
      // Network error
      console.error('[Network Error]', error.message);
      return new Error('Network error. Please check your internet connection.');
    } else {
      // Other error
      console.error('[Request Error]', error.message);
      return new Error(error.message || 'An unexpected error occurred.');
    }
  }

  /**
   * Utility Methods
   */

  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  async clearCache(): Promise<void> {
    // Clear any cached data if implemented
    console.log('Cache cleared');
  }
}

// Create singleton instance
const apiService = new APIService();

export default apiService;

// Named exports for specific use cases
export class MockAPIService extends APIService {
  constructor() {
    super('http://localhost:3001/api/v1');
  }

  // Override methods with mock data for development
  async getBusinessMetrics(): Promise<APIResponse<BusinessMetrics>> {
    return {
      success: true,
      data: {
        revenue: {
          id: 'revenue',
          name: 'Revenue',
          value: 1250000,
          previousValue: 1180000,
          change: 70000,
          changePercent: 5.93,
          trend: 'up',
          format: 'currency',
          unit: 'USD',
          target: 1300000
        },
        users: {
          id: 'users',
          name: 'Total Users',
          value: 15420,
          previousValue: 14850,
          change: 570,
          changePercent: 3.84,
          trend: 'up',
          format: 'number'
        },
        conversion: {
          id: 'conversion',
          name: 'Conversion Rate',
          value: 3.2,
          previousValue: 2.8,
          change: 0.4,
          changePercent: 14.29,
          trend: 'up',
          format: 'percentage',
          unit: '%'
        },
        churn: {
          id: 'churn',
          name: 'Churn Rate',
          value: 2.1,
          previousValue: 2.5,
          change: -0.4,
          changePercent: -16.0,
          trend: 'down',
          format: 'percentage',
          unit: '%'
        },
        ltv: {
          id: 'ltv',
          name: 'Customer LTV',
          value: 2400,
          previousValue: 2250,
          change: 150,
          changePercent: 6.67,
          trend: 'up',
          format: 'currency',
          unit: 'USD'
        },
        cac: {
          id: 'cac',
          name: 'Customer CAC',
          value: 180,
          previousValue: 195,
          change: -15,
          changePercent: -7.69,
          trend: 'down',
          format: 'currency',
          unit: 'USD'
        },
        mrr: {
          id: 'mrr',
          name: 'Monthly Recurring Revenue',
          value: 245000,
          previousValue: 235000,
          change: 10000,
          changePercent: 4.26,
          trend: 'up',
          format: 'currency',
          unit: 'USD'
        },
        arr: {
          id: 'arr',
          name: 'Annual Recurring Revenue',
          value: 2940000,
          previousValue: 2820000,
          change: 120000,
          changePercent: 4.26,
          trend: 'up',
          format: 'currency',
          unit: 'USD'
        }
      }
    };
  }
}

// Development environment detection
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Export appropriate service based on environment
export { 
  APIService, 
  MockAPIService,
  isDevelopment 
};

// Export the configured instance
export const api = isDevelopment ? new MockAPIService() : apiService;