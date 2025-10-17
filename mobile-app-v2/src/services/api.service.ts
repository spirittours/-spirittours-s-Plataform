/**
 * Servicio de API centralizado para la aplicación móvil
 * Maneja todas las peticiones HTTP con autenticación y manejo de errores
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configuración de la API
const API_CONFIG = {
  baseURL: __DEV__ 
    ? Platform.OS === 'android' 
      ? 'http://10.0.2.2:8000'  // Android emulator
      : 'http://localhost:8000'  // iOS simulator
    : 'https://api.spirittours.com',
  timeout: 30000,
};

class APIService {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadTokens();
  }

  /**
   * Configuración de interceptors para manejo de autenticación y errores
   */
  private setupInterceptors() {
    // Request Interceptor: Añadir token de autenticación
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response Interceptor: Manejo de errores y refresh token
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Si el error es 401 y no hemos intentado refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            if (newAccessToken) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            // Si el refresh falla, cerrar sesión
            await this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Cargar tokens almacenados
   */
  private async loadTokens() {
    try {
      this.accessToken = await AsyncStorage.getItem('accessToken');
      this.refreshToken = await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  /**
   * Guardar tokens
   */
  async setTokens(accessToken: string, refreshToken: string) {
    try {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  /**
   * Refrescar token de acceso
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await axios.post(
        `${API_CONFIG.baseURL}/api/auth/refresh`,
        { refresh_token: this.refreshToken }
      );

      const { access_token } = response.data;
      this.accessToken = access_token;
      await AsyncStorage.setItem('accessToken', access_token);
      return access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Cerrar sesión
   */
  async logout() {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.get<T>(url, config);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.post<T>(url, data, config);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.put<T>(url, data, config);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.patch<T>(url, data, config);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.delete<T>(url, config);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload de archivos
   */
  async upload<T = any>(url: string, formData: FormData): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      // Error de respuesta del servidor
      if (error.response) {
        const message = error.response.data?.message || error.response.data?.detail || 'Error en la petición';
        return new Error(message);
      }
      
      // Error de red
      if (error.request) {
        return new Error('Error de conexión. Por favor verifica tu internet.');
      }
    }

    // Error genérico
    return new Error(error.message || 'Error desconocido');
  }

  /**
   * Verificar si hay conexión a internet
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_CONFIG.baseURL}/health`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Exportar instancia única
export const apiService = new APIService();

// Exportar tipos útiles
export type { AxiosResponse };
