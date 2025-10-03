/**
 * Authentication API Service
 */

import apiClient, { setAuthToken as setToken } from './apiClient';
import { User, ApiResponse } from '../../types';

interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export const authAPI = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/auth/login', {
      email,
      password,
    });
    return response.data.data;
  },

  async register(email: string, password: string, name: string): Promise<LoginResponse> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/auth/register', {
      email,
      password,
      name,
    });
    return response.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
    setToken(null);
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/api/auth/me');
    return response.data.data;
  },

  async refreshToken(): Promise<string> {
    const response = await apiClient.post<ApiResponse<{ token: string }>>('/api/auth/refresh');
    const newToken = response.data.data.token;
    setToken(newToken);
    return newToken;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.put<ApiResponse<User>>('/api/auth/profile', data);
    return response.data.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  async resetPassword(email: string): Promise<void> {
    await apiClient.post('/api/auth/reset-password', { email });
  },

  setAuthToken: setToken,
};
