import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { showMessage } from 'react-native-flash-message';
import * as SecureStore from 'expo-secure-store';

// Types
interface ApiConfig {
  baseURL: string;
  timeout: number;
  enableLogging: boolean;
}

interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

class ApiService {
  private client: AxiosInstance;
  private config: ApiConfig;
  
  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      baseURL: config.baseURL || 'https://api.spirittours.com/api/v1',
      timeout: config.timeout || 15000,
      enableLogging: config.enableLogging ?? __DEV__,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add user agent
        config.headers['User-Agent'] = 'SpiritTours-Mobile/1.0';

        if (this.config.enableLogging) {
          console.log(`📡 ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        if (this.config.enableLogging) {
          console.error('❌ Request error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        if (this.config.enableLogging) {
          console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }

        return response.data;
      },
      async (error) => {
        const { response, config } = error;

        if (this.config.enableLogging) {
          console.error(`❌ ${config?.method?.toUpperCase()} ${config?.url}`, {
            status: response?.status,
            data: response?.data,
            message: error.message,
          });
        }

        // Handle different error scenarios
        if (response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          await SecureStore.deleteItemAsync('auth_token');
          await SecureStore.deleteItemAsync('refresh_token');
          
          showMessage({
            message: 'Session expired',
            description: 'Please log in again',
            type: 'warning',
          });
          
          // You might want to emit an event or use a global state manager
          // to handle navigation to login screen
        } else if (response?.status === 403) {
          showMessage({
            message: 'Access denied',
            description: 'You do not have permission to perform this action',
            type: 'danger',
          });
        } else if (response?.status >= 500) {
          showMessage({
            message: 'Server error',
            description: 'Please try again later',
            type: 'danger',
          });
        } else if (!response) {
          // Network error
          showMessage({
            message: 'Network error',
            description: 'Please check your internet connection',
            type: 'danger',
          });
        } else {
          // Other client errors
          const message = response.data?.message || 'An error occurred';
          showMessage({
            message: 'Error',
            description: message,
            type: 'danger',
          });
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // Authentication methods
  async login(credentials: { email: string; password: string }): Promise<{
    user: any;
    access_token: string;
    refresh_token: string;
  }> {
    const response = await this.post('/auth/login', credentials);
    
    // Store tokens securely
    await SecureStore.setItemAsync('auth_token', response.access_token);
    await SecureStore.setItemAsync('refresh_token', response.refresh_token);
    
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.post('/auth/logout');
    } finally {
      // Clear tokens regardless of API call success
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
    }
  }

  async refreshToken(): Promise<string> {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.post('/auth/refresh', {
      refresh_token: refreshToken,
    });

    await SecureStore.setItemAsync('auth_token', response.access_token);
    return response.access_token;
  }

  // Booking methods
  async getBookings(): Promise<any[]> {
    return this.get('/bookings');
  }

  async getBooking(bookingId: string): Promise<any> {
    return this.get(`/bookings/${bookingId}`);
  }

  async createBooking(bookingData: any): Promise<any> {
    return this.post('/bookings', bookingData);
  }

  async updateBooking(bookingId: string, updates: any): Promise<any> {
    return this.patch(`/bookings/${bookingId}`, updates);
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<any> {
    return this.post(`/bookings/${bookingId}/cancel`, { reason });
  }

  // Destinations methods
  async getDestinations(filters?: any): Promise<any[]> {
    return this.get('/destinations', { params: filters });
  }

  async getDestination(destinationId: string): Promise<any> {
    return this.get(`/destinations/${destinationId}`);
  }

  async getFeaturedDestinations(): Promise<any[]> {
    return this.get('/destinations/featured');
  }

  // Search methods
  async search(query: string, filters?: any): Promise<any> {
    return this.get('/search', { 
      params: { q: query, ...filters } 
    });
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    return this.get('/search/suggestions', { 
      params: { q: query } 
    });
  }

  // AI Agent methods
  async askAI(query: string, context?: any): Promise<any> {
    return this.post('/ai/query', { query, context });
  }

  async getAIRecommendations(): Promise<any[]> {
    return this.get('/ai/recommendations/personalized');
  }

  async startAIConversation(agentType?: string): Promise<any> {
    return this.post('/ai/conversations', { agent_type: agentType });
  }

  async continueAIConversation(conversationId: string, message: string): Promise<any> {
    return this.post(`/ai/conversations/${conversationId}/messages`, { message });
  }

  // Ticketing methods
  async getTickets(): Promise<any[]> {
    return this.get('/tickets');
  }

  async getTicket(ticketId: string): Promise<any> {
    return this.get(`/tickets/${ticketId}`);
  }

  async createTicket(ticketData: any): Promise<any> {
    return this.post('/tickets', ticketData);
  }

  async updateTicketStatus(ticketId: string, status: string, notes?: string): Promise<any> {
    return this.patch(`/tickets/${ticketId}/status`, { status, notes });
  }

  // User profile methods
  async getProfile(): Promise<any> {
    return this.get('/users/profile');
  }

  async updateProfile(profileData: any): Promise<any> {
    return this.patch('/users/profile', profileData);
  }

  async uploadProfileImage(imageUri: string): Promise<any> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);

    return this.post('/users/profile/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Notifications methods
  async getNotifications(): Promise<any[]> {
    return this.get('/notifications');
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    return this.patch(`/notifications/${notificationId}/read`);
  }

  async registerPushToken(token: string): Promise<void> {
    return this.post('/notifications/push-token', { token });
  }

  // File upload utility
  async uploadFile(fileUri: string, fileName: string, mimeType: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    } as any);

    return this.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health');
  }

  // Update base URL (useful for switching environments)
  updateBaseURL(newBaseURL: string) {
    this.config.baseURL = newBaseURL;
    this.client.defaults.baseURL = newBaseURL;
  }

  // Get current config
  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

// Create singleton instance
const apiService = new ApiService({
  baseURL: __DEV__ 
    ? 'http://localhost:8000/api/v1'  // Development
    : 'https://api.spirittours.com/api/v1',  // Production
  enableLogging: __DEV__,
});

export { apiService, ApiService };
export type { ApiConfig, ApiResponse };