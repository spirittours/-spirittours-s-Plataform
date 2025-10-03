/**
 * API Client Configuration
 * Axios instance with interceptors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { API_BASE_URL, API_TIMEOUT } from '../config';

let authToken: string | null = null;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          // Implement token refresh logic here
          // const newToken = await refreshToken();
          // return retry original request
        }
      } catch (refreshError) {
        // Logout user
        await Keychain.resetGenericPassword();
        await AsyncStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export default apiClient;
