import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'ios' 
    ? 'http://localhost:8000/api/v1'
    : 'http://10.0.2.2:8000/api/v1'  // Android emulator
  : 'https://api.spirittours.com/api/v1';

const API_TIMEOUT = 30000; // 30 seconds

// Token keys
const ACCESS_TOKEN_KEY = '@spirit_tours:access_token';
const REFRESH_TOKEN_KEY = '@spirit_tours:refresh_token';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Platform': Platform.OS,
    'X-App-Version': DeviceInfo.getVersion(),
    'X-Device-Id': DeviceInfo.getUniqueId(),
  },
});

// Token management
export const tokenManager = {
  async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },
  
  async setAccessToken(token: string): Promise<void> {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  
  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },
  
  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  
  async removeTokens(): Promise<void> {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  },
  
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, accessToken],
      [REFRESH_TOKEN_KEY, refreshToken],
    ]);
  },
};

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return Promise.reject(new Error('No internet connection'));
    }
    
    // Add auth token
    const accessToken = await tokenManager.getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Add language header
    const language = await AsyncStorage.getItem('@spirit_tours:language');
    if (language) {
      config.headers['Accept-Language'] = language;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await tokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await apiClient.post('/auth/refresh', {
            refresh_token: refreshToken,
          });
          
          const {access_token, refresh_token: newRefreshToken} = response.data;
          await tokenManager.setTokens(access_token, newRefreshToken);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        await tokenManager.removeTokens();
        // Redirect to login
        // Store dispatch logout action
      }
    }
    
    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },
  
  // POST request
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  },
  
  // PUT request
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  },
  
  // PATCH request
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.patch<T>(url, data, config);
    return response.data;
  },
  
  // DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },
  
  // Upload file
  async upload<T = any>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response = await apiClient.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },
};

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    socialLogin: '/auth/social',
  },
  
  // User
  user: {
    profile: '/user/profile',
    updateProfile: '/user/profile',
    changePassword: '/user/change-password',
    preferences: '/user/preferences',
    notifications: '/user/notifications',
  },
  
  // Tours
  tours: {
    list: '/tours',
    detail: (id: string) => `/tours/${id}`,
    featured: '/tours/featured',
    popular: '/tours/popular',
    search: '/tours/search',
    categories: '/tours/categories',
    reviews: (id: string) => `/tours/${id}/reviews`,
    availability: (id: string) => `/tours/${id}/availability`,
  },
  
  // Bookings
  bookings: {
    create: '/bookings',
    list: '/bookings',
    detail: (id: string) => `/bookings/${id}`,
    cancel: (id: string) => `/bookings/${id}/cancel`,
    modify: (id: string) => `/bookings/${id}/modify`,
    payment: '/bookings/payment',
  },
  
  // Chat
  chat: {
    conversations: '/chat/conversations',
    messages: (id: string) => `/chat/conversations/${id}/messages`,
    send: '/chat/send',
  },
  
  // Support
  support: {
    tickets: '/support/tickets',
    createTicket: '/support/tickets',
    ticketDetail: (id: string) => `/support/tickets/${id}`,
    faq: '/support/faq',
  },
};

export default apiClient;